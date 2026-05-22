'use client'
/**
 * Reusable address autocomplete input.
 *
 * Primary provider: Google Places (Autocomplete + Place Details), loaded
 * lazily from the JS API the first time the user starts typing. Falls
 * back to Photon (OpenStreetMap, no key required, CORS-enabled) when
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set OR the Google call fails
 * (invalid key, REQUEST_DENIED, OVER_QUERY_LIMIT, etc.), so the input
 * is never a dead-end.
 *
 * On selection, fires `onAddressSelect` with a fully parsed
 * ParsedAddress whose field names mirror the columns already used on
 * the `clients` / `jobs` tables — drop the payload into an insert.
 *
 * Keyboard:
 *   - ArrowDown / ArrowUp move the highlighted suggestion
 *   - Enter selects the highlighted suggestion
 *   - Escape closes the dropdown
 *
 * Accessibility: implements the WAI-ARIA combobox pattern via the
 * aria-controls / aria-activedescendant attributes on the input and
 * role="listbox" / role="option" on the dropdown.
 */
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Loader2, MapPin, AlertCircle } from 'lucide-react'
import type { ParsedAddress } from '@/types/address'
import { EMPTY_PARSED_ADDRESS } from '@/types/address'

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300

export interface AddressAutocompleteProps {
  /** Fires with the structured address whenever the user picks a suggestion. */
  onAddressSelect: (address: ParsedAddress) => void
  /** Fires on every keystroke. Optional — most consumers only need onAddressSelect. */
  onInputChange?: (value: string) => void
  placeholder?: string
  /** Pre-fills the input. Useful for "edit" forms. */
  defaultValue?: string
  className?: string
  disabled?: boolean
  /** Forwarded to the underlying <input>. */
  id?: string
  /** Whether the field is required (forwarded to the input). */
  required?: boolean
  /** ISO country code for biasing results. Defaults to "us". */
  country?: string
  /** aria-label for the input. */
  ariaLabel?: string
}

interface Suggestion {
  label: string
  /** Google place_id when the suggestion came from Google. */
  placeId?: string
  /** Photon feature properties, when the suggestion came from Photon. */
  photon?: Record<string, unknown>
  photonCoords?: [number, number] | null
}

// ---------------------------------------------------------------------------
// Google JS API loader (memoised so we only inject the script once per page).
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

// ---------------------------------------------------------------------------
// Provider: Google Places
// ---------------------------------------------------------------------------
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
        // Only OK with non-empty results is usable. Any error status —
        // REQUEST_DENIED, OVER_QUERY_LIMIT, INVALID_REQUEST, ZERO_RESULTS,
        // bad key, billing off — must surface as a rejection so the caller
        // falls through to Photon instead of dead-ending on an empty list.
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
  // PlacesService requires a DOM node for attribution. A detached div is fine.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGoogleComponents(place: any): ParsedAddress {
  const comps: Array<{ long_name: string; short_name: string; types: string[] }> =
    place.address_components || []
  const find = (...types: string[]) =>
    comps.find(c => types.some(t => c.types.includes(t)))
  const findShort = (...types: string[]) => find(...types)?.short_name || ''
  const findLong = (...types: string[]) => find(...types)?.long_name || ''

  const street_number = findLong('street_number')
  const street_name = findLong('route')
  const full_street = [street_number, street_name].filter(Boolean).join(' ')
  const city =
    findLong('locality') ||
    findLong('postal_town') ||
    findLong('sublocality') ||
    findLong('administrative_area_level_2')
  const state = findShort('administrative_area_level_1')
  const zip_code = findLong('postal_code')
  const country = findShort('country')
  const lat = place.geometry?.location?.lat?.() ?? null
  const lng = place.geometry?.location?.lng?.() ?? null

  return {
    full_street,
    street_number,
    street_name,
    city,
    state,
    zip_code,
    country,
    lat: typeof lat === 'number' ? lat : null,
    lng: typeof lng === 'number' ? lng : null,
    place_id: place.place_id || '',
    formatted_address: place.formatted_address || full_street,
  }
}

// ---------------------------------------------------------------------------
// Provider: Photon (OpenStreetMap) — keyless fallback
// ---------------------------------------------------------------------------
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
  // Bias the configured country to the top without dropping international matches.
  if (cc) {
    mapped.sort((a, b) => {
      const ac = String((a.photon?.countrycode as string | undefined) || '').toUpperCase()
      const bc = String((b.photon?.countrycode as string | undefined) || '').toUpperCase()
      return (ac === cc ? 0 : 1) - (bc === cc ? 0 : 1)
    })
  }
  return mapped.slice(0, 6)
}

function formatPhotonLabel(p: Record<string, unknown>): string {
  const num = (p.housenumber as string) || ''
  const street = (p.street as string) || (p.name as string) || ''
  const cityish =
    (p.city as string) || (p.town as string) || (p.village as string) || (p.locality as string) || ''
  const state = (p.state as string) || ''
  const zip = (p.postcode as string) || ''
  const country = (p.country as string) || ''
  const line1 = [num, street].filter(Boolean).join(' ')
  const tail = [cityish, [state, zip].filter(Boolean).join(' '), country].filter(Boolean).join(', ')
  return [line1, tail].filter(Boolean).join(', ')
}

function parsePhotonFeature(p: Record<string, unknown>, coords: [number, number] | null): ParsedAddress {
  const street_number = (p.housenumber as string) || ''
  const street_name = (p.street as string) || (p.name as string) || ''
  const full_street = [street_number, street_name].filter(Boolean).join(' ')
  const city =
    (p.city as string) || (p.town as string) || (p.village as string) || (p.locality as string) || ''
  const stateRaw = String((p.state as string) || '')
  // Photon returns full state names. Convert common US states to 2-letter
  // codes; otherwise return as-is so non-US values aren't mangled.
  const state = US_STATE_TO_ABBR[stateRaw] || stateRaw
  const zip_code = (p.postcode as string) || ''
  const country = String((p.countrycode as string) || '').toUpperCase()
  const formatted_address = formatPhotonLabel(p)
  return {
    full_street,
    street_number,
    street_name,
    city,
    state,
    zip_code,
    country,
    lat: coords ? coords[1] : null,
    lng: coords ? coords[0] : null,
    place_id: '',
    formatted_address,
  }
}

const US_STATE_TO_ABBR: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
  'District of Columbia': 'DC',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AddressAutocomplete({
  onAddressSelect,
  onInputChange,
  placeholder = 'Start typing an address…',
  defaultValue = '',
  className = '',
  disabled = false,
  id,
  required = false,
  country = 'us',
  ariaLabel = 'Address',
}: AddressAutocompleteProps) {
  const reactId = useId()
  const inputId = id || `addr-${reactId}`
  const listboxId = `${inputId}-listbox`

  const [query, setQuery] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wrapperRef = useRef<HTMLDivElement>(null)
  /** Set true to suppress the next debounced search (e.g. immediately after a selection). */
  const skipNext = useRef(false)
  /** Monotonic request id so out-of-order responses don't overwrite newer results. */
  const reqIdRef = useRef(0)

  // ---- Suggestion fetch (Google → Photon fallback) ------------------------
  const fetchSuggestions = useCallback(async (q: string) => {
    const myReqId = ++reqIdRef.current
    setLoading(true)
    setError(null)
    try {
      let results: Suggestion[] = []
      if (GOOGLE_KEY) {
        try {
          results = await googleSuggest(q, country)
        } catch {
          // Google denied / over quota / no results — fall through silently.
          results = []
        }
      }
      if (results.length === 0) {
        try {
          results = await photonSuggest(q, country)
        } catch (e) {
          throw e instanceof Error ? e : new Error('PHOTON_FAILED')
        }
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

  // ---- Debounce on query change ------------------------------------------
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

  // ---- Click-outside closes the dropdown ---------------------------------
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // ---- Selection handler --------------------------------------------------
  const selectSuggestion = useCallback(async (s: Suggestion) => {
    // Optimistically update the visible text + close the dropdown.
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
      // Last-resort: hand back at least the label so the caller can store something.
      parsed = { ...EMPTY_PARSED_ADDRESS, formatted_address: s.label }
    }
    // Make sure the visible text always reflects the canonical formatted address.
    if (parsed.formatted_address) {
      skipNext.current = true
      setQuery(parsed.formatted_address)
    }
    onAddressSelect(parsed)
  }, [onAddressSelect])

  // ---- Keyboard navigation ------------------------------------------------
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

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)
    onInputChange?.(v)
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
          onChange={onChange}
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
        <p
          role="status"
          className="mt-1.5 flex items-center gap-1.5 text-xs text-orange-600"
        >
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
    </div>
  )
}
