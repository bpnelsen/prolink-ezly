/**
 * Pure parsing helpers shared by AddressAutocomplete (browser) and the
 * /api/v1/geocode route (server). Kept side-effect-free so they can be
 * unit-tested without DOM or network mocks.
 */
import type { ParsedAddress } from '@/types/address'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseGoogleComponents(place: any): ParsedAddress {
  const comps: Array<{ long_name: string; short_name: string; types: string[] }> =
    place?.address_components || []
  const find = (...types: string[]) => comps.find(c => types.some(t => c.types.includes(t)))
  const findShort = (...types: string[]) => find(...types)?.short_name || ''
  const findLong = (...types: string[]) => find(...types)?.long_name || ''

  const street_number = findLong('street_number')
  const street_name = findLong('route')
  const full_street = [street_number, street_name].filter(Boolean).join(' ')
  const city =
    findLong('locality') ||
    findLong('postal_town') ||
    findLong('sublocality')
  const county = findLong('administrative_area_level_2')
  const state = findShort('administrative_area_level_1')
  const zip_code = findLong('postal_code')
  const country = findShort('country')

  // Geometry.location may be a literal { lat, lng } (Geocoding API REST)
  // or a LatLng object with lat()/lng() methods (Places JS API).
  let lat: number | null = null
  let lng: number | null = null
  const loc = place?.geometry?.location
  if (loc) {
    const rawLat = typeof loc.lat === 'function' ? loc.lat() : loc.lat
    const rawLng = typeof loc.lng === 'function' ? loc.lng() : loc.lng
    if (typeof rawLat === 'number') lat = rawLat
    if (typeof rawLng === 'number') lng = rawLng
  }

  return {
    full_street,
    street_number,
    street_name,
    city,
    state,
    zip_code,
    county,
    country,
    lat,
    lng,
    place_id: place?.place_id || '',
    formatted_address: place?.formatted_address || full_street,
  }
}

export function parsePhotonFeature(
  p: Record<string, unknown>,
  coords: [number, number] | null
): ParsedAddress {
  const street_number = (p.housenumber as string) || ''
  const street_name = (p.street as string) || (p.name as string) || ''
  const full_street = [street_number, street_name].filter(Boolean).join(' ')
  const city =
    (p.city as string) || (p.town as string) || (p.village as string) || (p.locality as string) || ''
  const stateRaw = String((p.state as string) || '')
  const state = US_STATE_TO_ABBR[stateRaw] || stateRaw
  const zip_code = (p.postcode as string) || ''
  const county = (p.county as string) || ''
  const country = String((p.countrycode as string) || '').toUpperCase()
  return {
    full_street,
    street_number,
    street_name,
    city,
    state,
    zip_code,
    county,
    country,
    lat: coords ? coords[1] : null,
    lng: coords ? coords[0] : null,
    place_id: '',
    formatted_address: formatPhotonLabel(p),
  }
}

export function formatPhotonLabel(p: Record<string, unknown>): string {
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

export const US_STATE_TO_ABBR: Record<string, string> = {
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
