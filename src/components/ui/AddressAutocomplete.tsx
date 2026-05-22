'use client'
/**
 * Reusable address autocomplete input.
 *
 * Providers:
 *  1. Google Places (Autocomplete + Place Details), loaded lazily on
 *     the first keystroke. Used when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 *     is set.
 *  2. Photon (OpenStreetMap), keyless + CORS-enabled. Used when
 *     Google is unconfigured OR returns any non-OK status — invalid
 *     key, REQUEST_DENIED, OVER_QUERY_LIMIT, ZERO_RESULTS — so the
 *     field is never a dead-end.
 *
 * Modes:
 *  - Controlled: pass both `value` and `onChange`. Parent owns the input text.
 *  - Uncontrolled: omit `value`; pass `defaultValue` to pre-fill.
 *
 * Form library integration: forwards `ref` to the underlying input, so
 * `<Controller render={({ field }) => <AddressAutocomplete ref={field.ref}
 *   value={field.value} onChange={field.onChange} onAddressSelect={...} />}/>`
 * works out of the box with React Hook Form. The `onAddressSelect`
 * callback is the structured payload — call `field.onChange(addr.formatted_address)`
 * inside it (and store the parsed fields wherever the form keeps them).
 *
 * Accessibility: WAI-ARIA combobox pattern (role="combobox" + aria-controls
 * + aria-expanded + aria-activedescendant) with role="listbox"/"option".
 * Full keyboard: ArrowUp/Down, Enter, Escape.
 */
import {
  ChangeEvent,
  ForwardedRef,
  forwardRef,
  KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Loader2, MapPin, AlertCircle, Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import type { ParsedAddress } from '@/types/address'
import { EMPTY_PARSED_ADDRESS } from '@/types/address'
import { parseGoogleComponents, parsePhotonFeature, formatPhotonLabel } from '@/lib/address-parsing'

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300

export interface AddressAutocompleteProps {
  onAddressSelect: (address: ParsedAddress) => void
  /** Controlled input text. When provided, the consumer owns the value. */
  value?: string
  /** Uncontrolled initial value. Ignored when `value` is set. */
  defaultValue?: string
  /** Fires on every keystroke (and on programmatic updates after selection). */
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
  required?: boolean
  /** ISO country code for biasing results. Defaults to "us". */
  country?: string
  ariaLabel?: string
  /** Show an inline expandable "Fill in manually" panel for editing the parsed fields. */
  withManualFields?: boolean
  /** Initial parsed value, used to seed the manual-fields panel (e.g. on an edit form). */
  initialAddress?: ParsedAddress
}

export interface AddressAutocompleteHandle {
  focus: () => void
  /** Read the current ParsedAddress without going through the parent. */
  getAddress: () => ParsedAddress
}

interface Suggestion {
  label: string
  placeId?: string
  photon?: Record<string, unknown>
  photonCoords?: [number, number] | null
}

// ---------------------------------------------------------------------------
// Google JS API loader
// ---------------------------------------------------------------------------
let googleLoaderPromise: Promise<void> | null = null
function loadGoogle(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  if (!GOOGLE_KEY) return Promise.reject(new Error('NO_KEY'))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).google?.maps?.places) return Promise.resolve()
  if (googleLoaderPromise) return googleLoaderPromise
  googleLoaderPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-prolink-gmaps]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('SCRIPT_ERROR')))
      return
    }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places&v=weekly`
    s.async = true
    s.defer = true
    s.dataset.prolinkGmaps = '1'
    s.onload = () => resolve()
    s.onerror = () => { googleLoaderPromise = null; reject(new Error('SCRIPT_ERROR')) }
    document.head.appendChild(s)
  })
  return googleLoaderPromise
}

async function googleSuggest(q: string, country: string): Promise<Suggestion[]> {
  await loadGoogle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = (window as any).google
  const svc = new g.maps.places.AutocompleteService()
  return new Promise<Suggestion[]>((resolve, reject) => {
    svc.getPlacePredictions(
      {
        input: q,
        types: ['address'],
        componentRestrictions: country ? { country } : undefined,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (preds: any, status: string) => {
        if (status === 'OK' && Array.isArray(preds) && preds.length > 0) {
          resolve(preds.slice(0, 6).map((p: { description: string; place_id: string }) => ({
            label: p.description,
            placeId: p.place_id,
          })))
        } else {
          reject(new Error(status || 'NO_RESULTS'))
        }
      }
    )
  })
}

async function googleDetails(placeId: string): Promise<ParsedAddress | null> {
  await loadGoogle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = (window as any).google
  const host = document.createElement('div')
  const svc = new g.maps.places.PlacesService(host)
  return new Promise<ParsedAddress | null>(resolve => {
    svc.getDetails(
      { placeId, fields: ['address_components', 'formatted_address', 'geometry', 'place_id'] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (place: any, status: string) => {
        if (status !== 'OK' || !place) { resolve(null); return }
        resolve(parseGoogleComponents(place))
      }
    )
  })
}

async function photonSuggest(q: string, country: string): Promise<Suggestion[]> {
  const res = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`,
    { cache: 'no-store' }
  )
  if (!res.ok) throw new Error('PHOTON_HTTP_' + res.status)
  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feats: any[] = data?.features || []
  const cc = country ? country.toUpperCase() : ''
  const mapped: Suggestion[] = (feats
    .map(f => {
      const p = f.properties || {}
      const label = formatPhotonLabel(p)
      if (!label) return null
      const coords =
        Array.isArray(f.geometry?.coordinates) && f.geometry.coordinates.length === 2
          ? ([f.geometry.coordinates[0], f.geometry.coordinates[1]] as [number, number])
          : null
      const s: Suggestion = { label, photon: p as Record<string, unknown>, photonCoords: coords }
      return s
    })
    .filter((s): s is Suggestion => s !== null))
  if (cc) {
    mapped.sort((a, b) => {
      const ac = String((a.photon?.countrycode as string | undefined) || '').toUpperCase()
      const bc = String((b.photon?.countrycode as string | undefined) || '').toUpperCase()
      return (ac === cc ? 0 : 1) - (bc === cc ? 0 : 1)
    })
  }
  return mapped.slice(0, 6)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const AddressAutocomplete = forwardRef<HTMLInputElement, AddressAutocompleteProps>(
  function AddressAutocomplete(props, ref: ForwardedRef<HTMLInputElement>) {
    const {
      onAddressSelect,
      value,
      defaultValue = '',
      onChange,
      placeholder = 'Start typing an address…',
      className = '',
      disabled = false,
      id,
      required = false,
      country = 'us',
      ariaLabel = 'Address',
      withManualFields = false,
      initialAddress,
    } = props

    const reactId = useId()
    const inputId = id || `addr-${reactId}`
    const listboxId = `${inputId}-listbox`

    const isControlled = value !== undefined
    const [internalQuery, setInternalQuery] = useState<string>(
      isControlled ? '' : (defaultValue || initialAddress?.formatted_address || '')
    )
    const query = isControlled ? (value as string) : internalQuery
    const setQuery = useCallback((next: string) => {
      if (!isControlled) setInternalQuery(next)
      onChange?.(next)
    }, [isControlled, onChange])

    const [suggestions, setSuggestions] = useState<Suggestion[]>([])
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Manual-fields panel state mirrors the last selected ParsedAddress;
    // edits propagate via onAddressSelect so the parent stays the source of truth.
    const [manualOpen, setManualOpen] = useState(false)
    const [manualAddr, setManualAddr] = useState<ParsedAddress>(
      initialAddress || EMPTY_PARSED_ADDRESS
    )

    const wrapperRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const skipNext = useRef(false)
    const reqIdRef = useRef(0)

    useImperativeHandle(ref, () => ({
      // Forward focus to the input. ref can be either the DOM node (when
      // a caller passes a raw ref) or our handle interface; in either
      // case calling .focus() is what matters.
      ...inputRef.current,
      focus: () => inputRef.current?.focus(),
    } as HTMLInputElement), [])

    const fetchSuggestions = useCallback(async (q: string) => {
      const myReqId = ++reqIdRef.current
      setLoading(true)
      setError(null)
      try {
        let results: Suggestion[] = []
        if (GOOGLE_KEY) {
          try { results = await googleSuggest(q, country) } catch { results = [] }
        }
        if (results.length === 0) {
          results = await photonSuggest(q, country)
        }
        if (myReqId !== reqIdRef.current) return
        setSuggestions(results)
        setOpen(results.length > 0)
        setActiveIndex(-1)
      } catch (e) {
        if (myReqId !== reqIdRef.current) return
        setSuggestions([])
        setOpen(false)
        setError(e instanceof Error ? e.message : 'Lookup failed')
      } finally {
        if (myReqId === reqIdRef.current) setLoading(false)
      }
    }, [country])

    useEffect(() => {
      if (skipNext.current) { skipNext.current = false; return }
      const q = query.trim()
      if (q.length < MIN_QUERY_LENGTH) {
        setSuggestions([])
        setOpen(false)
        setLoading(false)
        return
      }
      const handle = setTimeout(() => { fetchSuggestions(q) }, DEBOUNCE_MS)
      return () => clearTimeout(handle)
    }, [query, fetchSuggestions])

    useEffect(() => {
      function onDocClick(e: MouseEvent) {
        if (!wrapperRef.current) return
        if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
      }
      document.addEventListener('mousedown', onDocClick)
      return () => document.removeEventListener('mousedown', onDocClick)
    }, [])

    const emit = useCallback((addr: ParsedAddress) => {
      setManualAddr(addr)
      onAddressSelect(addr)
    }, [onAddressSelect])

    const selectSuggestion = useCallback(async (s: Suggestion) => {
      skipNext.current = true
      setQuery(s.label)
      setOpen(false)
      setActiveIndex(-1)

      let parsed: ParsedAddress | null = null
      if (s.placeId && GOOGLE_KEY) {
        setLoading(true)
        try { parsed = await googleDetails(s.placeId) } catch { parsed = null }
        setLoading(false)
      }
      if (!parsed && s.photon) {
        parsed = parsePhotonFeature(s.photon, s.photonCoords || null)
      }
      if (!parsed) {
        parsed = { ...EMPTY_PARSED_ADDRESS, formatted_address: s.label }
      }
      if (parsed.formatted_address) {
        skipNext.current = true
        setQuery(parsed.formatted_address)
      }
      emit(parsed)
    }, [emit, setQuery])

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && suggestions.length > 0) {
        setOpen(true)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        if (open && activeIndex >= 0 && activeIndex < suggestions.length) {
          e.preventDefault()
          selectSuggestion(suggestions[activeIndex])
        }
      } else if (e.key === 'Escape') {
        setOpen(false)
        setActiveIndex(-1)
      }
    }

    const handleManualChange = (field: keyof ParsedAddress, val: string) => {
      const next: ParsedAddress = { ...manualAddr, [field]: val }
      // Recompute full_street + formatted_address from the parts users actually edit.
      if (field === 'street_number' || field === 'street_name') {
        next.full_street = [next.street_number, next.street_name].filter(Boolean).join(' ')
      }
      next.formatted_address = composeFormatted(next)
      // Edits invalidate the place_id (the canonical Google reference no longer matches).
      next.place_id = ''
      emit(next)
      // Keep the visible input in sync with the formatted address.
      skipNext.current = true
      setQuery(next.formatted_address)
    }

    const onInputTextChange = (e: ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value)
    }

    const activeOptionId = useMemo(
      () => (activeIndex >= 0 ? `${inputId}-opt-${activeIndex}` : undefined),
      [activeIndex, inputId]
    )

    return (
      <div ref={wrapperRef} className={`relative ${className}`}>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <MapPin size={16} aria-hidden="true" />
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            autoComplete="off"
            spellCheck={false}
            aria-label={ariaLabel}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            value={query}
            onChange={onInputTextChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#0f3a7d] focus:ring-2 focus:ring-[#0f3a7d]/20 disabled:bg-gray-50 disabled:text-gray-400 transition"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
              <Loader2 size={16} className="animate-spin" />
            </span>
          )}
        </div>

        {error && !open && (
          <p role="status" className="mt-1.5 flex items-center gap-1.5 text-xs text-orange-600">
            <AlertCircle size={12} aria-hidden="true" />
            Could not load suggestions. You can still type the address manually.
          </p>
        )}

        {open && suggestions.length > 0 && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Address suggestions"
            className="absolute z-30 mt-1 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto"
          >
            {suggestions.map((s, i) => {
              const active = i === activeIndex
              return (
                <li
                  key={`${s.placeId || 'photon'}-${i}`}
                  id={`${inputId}-opt-${i}`}
                  role="option"
                  aria-selected={active}
                  onMouseDown={e => { e.preventDefault(); selectSuggestion(s) }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex items-start gap-2 px-3 py-2.5 cursor-pointer text-sm transition ${
                    active ? 'bg-[#e6fcf9] text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <MapPin size={14} className="mt-0.5 shrink-0 text-[#0d9e8c]" aria-hidden="true" />
                  <span className="leading-snug">{s.label}</span>
                </li>
              )
            })}
          </ul>
        )}

        {withManualFields && (
          <div className="mt-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setManualOpen(o => !o)}
              aria-expanded={manualOpen}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f3a7d] hover:underline disabled:text-gray-400"
            >
              <Pencil size={12} aria-hidden="true" />
              {manualOpen ? 'Hide manual fields' : 'Fill in manually'}
              {manualOpen ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
            </button>
            {manualOpen && (
              <ManualFields
                value={manualAddr}
                onChange={handleManualChange}
                disabled={disabled}
                idPrefix={inputId}
              />
            )}
          </div>
        )}
      </div>
    )
  }
)

export default AddressAutocomplete

// ---------------------------------------------------------------------------
// Manual fields panel
// ---------------------------------------------------------------------------
function ManualFields({
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  value: ParsedAddress
  onChange: (field: keyof ParsedAddress, val: string) => void
  disabled?: boolean
  idPrefix: string
}) {
  const fieldCls =
    'w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#0f3a7d] focus:ring-2 focus:ring-[#0f3a7d]/20 disabled:bg-gray-50 disabled:text-gray-400 transition'
  const labelCls = 'block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1'
  return (
    <div className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-100 grid grid-cols-1 sm:grid-cols-6 gap-3">
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-num`} className={labelCls}>Street #</label>
        <input
          id={`${idPrefix}-num`}
          className={fieldCls}
          value={value.street_number}
          onChange={e => onChange('street_number', e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="sm:col-span-4">
        <label htmlFor={`${idPrefix}-street`} className={labelCls}>Street name</label>
        <input
          id={`${idPrefix}-street`}
          className={fieldCls}
          value={value.street_name}
          onChange={e => onChange('street_name', e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="sm:col-span-3">
        <label htmlFor={`${idPrefix}-city`} className={labelCls}>City</label>
        <input
          id={`${idPrefix}-city`}
          className={fieldCls}
          value={value.city}
          onChange={e => onChange('city', e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="sm:col-span-1">
        <label htmlFor={`${idPrefix}-state`} className={labelCls}>State</label>
        <input
          id={`${idPrefix}-state`}
          className={fieldCls}
          maxLength={2}
          value={value.state}
          onChange={e => onChange('state', e.target.value.toUpperCase())}
          disabled={disabled}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-zip`} className={labelCls}>ZIP</label>
        <input
          id={`${idPrefix}-zip`}
          className={fieldCls}
          value={value.zip_code}
          onChange={e => onChange('zip_code', e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="sm:col-span-6">
        <label htmlFor={`${idPrefix}-country`} className={labelCls}>Country</label>
        <input
          id={`${idPrefix}-country`}
          className={fieldCls}
          maxLength={2}
          value={value.country}
          onChange={e => onChange('country', e.target.value.toUpperCase())}
          disabled={disabled}
          placeholder="US"
        />
      </div>
    </div>
  )
}

function composeFormatted(a: ParsedAddress): string {
  const tail = [a.city, [a.state, a.zip_code].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [a.full_street, tail, a.country].filter(Boolean).join(', ')
}
