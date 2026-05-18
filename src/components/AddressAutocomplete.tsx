'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

export interface ParsedAddress {
  line1: string
  city: string
  state: string
  postal_code: string
  country: string
  formatted: string
}

interface Suggestion {
  label: string
  parsed: ParsedAddress
  placeId?: string
}

interface Props {
  value: string
  onChange: (text: string) => void
  /** Fired when the user picks a suggestion — gives structured parts. */
  onSelect?: (addr: ParsedAddress) => void
  placeholder?: string
  className?: string
  id?: string
  required?: boolean
}

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

// ---- Google Maps JS loader (only used when a key is configured) ----------
let googlePromise: Promise<void> | null = null
function loadGoogle(): Promise<void> {
  if (typeof window === 'undefined' || !GOOGLE_KEY) return Promise.reject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).google?.maps?.places) return Promise.resolve()
  if (googlePromise) return googlePromise
  googlePromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places&loading=async`
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject()
    document.head.appendChild(s)
  })
  return googlePromise
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGoogleComponents(comps: any[]): ParsedAddress {
  const get = (type: string, short = false) => {
    const c = comps.find(x => x.types?.includes(type))
    return c ? (short ? c.short_name : c.long_name) : ''
  }
  const line1 = [get('street_number'), get('route')].filter(Boolean).join(' ')
  const city = get('locality') || get('postal_town') || get('sublocality') || get('administrative_area_level_2')
  const state = get('administrative_area_level_1', true)
  const postal_code = get('postal_code')
  const country = get('country', true)
  const formatted = [line1, city, [state, postal_code].filter(Boolean).join(' '), country]
    .filter(Boolean)
    .join(', ')
  return { line1, city, state, postal_code, country, formatted }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePhoton(props: any): ParsedAddress {
  const line1 =
    props.housenumber && props.street
      ? `${props.housenumber} ${props.street}`
      : props.street || props.name || ''
  const city = props.city || props.district || props.county || ''
  const state = props.state || ''
  const postal_code = props.postcode || ''
  const country = props.countrycode || props.country || ''
  const formatted = [
    line1 || props.name,
    city,
    [state, postal_code].filter(Boolean).join(' '),
    props.country,
  ]
    .filter(Boolean)
    .join(', ')
  return { line1: line1 || props.name || '', city, state, postal_code, country, formatted }
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  id,
  required,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const skipNext = useRef(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    // Google path (only when a key is set and the SDK loads).
    if (GOOGLE_KEY) {
      try {
        await loadGoogle()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const g = (window as any).google
        const svc = new g.maps.places.AutocompleteService()
        const preds: { description: string; place_id: string }[] = await new Promise(res =>
          svc.getPlacePredictions(
            { input: q, types: ['address'], componentRestrictions: { country: 'us' } },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: any) => res(p || [])
          )
        )
        return preds.slice(0, 5).map(p => ({
          label: p.description,
          placeId: p.place_id,
          parsed: { line1: '', city: '', state: '', postal_code: '', country: '', formatted: p.description },
        }))
      } catch {
        /* fall through to keyless */
      }
    }
    // Keyless default: Photon (OpenStreetMap), no API key, CORS-enabled.
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`
    ).catch(() => null)
    if (!res || !res.ok) return []
    const data = await res.json().catch(() => null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feats: any[] = data?.features || []
    const mapped = feats.map(f => {
      const parsed = parsePhoton(f.properties || {})
      return { label: parsed.formatted, parsed }
    })
    // US first for this contractor audience.
    return mapped
      .filter(m => m.label)
      .sort((a, b) => {
        const au = a.parsed.country === 'US' ? 0 : 1
        const bu = b.parsed.country === 'US' ? 0 : 1
        return au - bu
      })
      .slice(0, 6)
  }, [])

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false
      return
    }
    const q = value.trim()
    if (q.length < 4) {
      setSuggestions([])
      setOpen(false)
      return
    }
    const t = setTimeout(async () => {
      const s = await search(q)
      setSuggestions(s)
      setOpen(s.length > 0)
      setActive(-1)
    }, 300)
    return () => clearTimeout(t)
  }, [value, search])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const choose = async (s: Suggestion) => {
    let parsed = s.parsed
    // For Google predictions we only have a place_id until now — resolve it.
    if (s.placeId && GOOGLE_KEY) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const g = (window as any).google
        const geo = new g.maps.Geocoder()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r: any = await new Promise((resolve, reject) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          geo.geocode({ placeId: s.placeId }, (res: any, status: string) =>
            status === 'OK' && res?.[0] ? resolve(res[0]) : reject()
          )
        )
        parsed = parseGoogleComponents(r.address_components || [])
      } catch {
        /* keep the description-only parsed */
      }
    }
    skipNext.current = true
    onChange(parsed.line1 || parsed.formatted)
    onSelect?.(parsed)
    setOpen(false)
    setSuggestions([])
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        id={id}
        required={required}
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        className={className}
        onChange={e => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={e => {
          if (!open) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, suggestions.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
          else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(suggestions[active]) }
          else if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto text-sm">
          {suggestions.map((s, i) => (
            <li
              key={`${s.label}-${i}`}
              onMouseDown={e => { e.preventDefault(); choose(s) }}
              onMouseEnter={() => setActive(i)}
              className={`px-3 py-2 cursor-pointer ${i === active ? 'bg-teal-50 text-teal-800' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
