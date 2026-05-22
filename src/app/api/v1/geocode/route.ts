import { NextRequest, NextResponse } from 'next/server'
import { parseGoogleComponents, parsePhotonFeature } from '@/lib/address-parsing'
import type { ParsedAddress } from '@/types/address'
import { EMPTY_PARSED_ADDRESS } from '@/types/address'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/geocode
 *
 * Free-text → ParsedAddress lookup, used to backfill structured fields
 * (and lat/lng) when an address was hand-typed instead of selected from
 * the autocomplete dropdown. Useful for the "Fill manually" path and for
 * any server-side import flow.
 *
 * Provider order:
 *   1. Google Geocoding API when GOOGLE_MAPS_API_KEY (server-only) or
 *      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set.
 *   2. Photon (OpenStreetMap), keyless, when Google is unavailable or
 *      returns no usable result. Same fallback semantics as the
 *      browser autocomplete so behaviour stays consistent.
 *
 * Body: { address: string, country?: string }
 * Returns: { address: ParsedAddress, provider: 'google' | 'photon' | null }
 */
export async function POST(req: NextRequest) {
  let body: { address?: string; country?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const address = (body.address || '').trim()
  if (address.length < 3) {
    return NextResponse.json({ error: 'address_too_short' }, { status: 400 })
  }
  const country = (body.country || 'us').toLowerCase()

  const googleKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ''

  // --- Google Geocoding API --------------------------------------------------
  if (googleKey) {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
      url.searchParams.set('address', address)
      url.searchParams.set('region', country)
      url.searchParams.set('key', googleKey)
      const res = await fetch(url.toString(), { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json() as {
          status: string
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          results?: any[]
        }
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const parsed = parseGoogleComponents(data.results[0])
          return NextResponse.json({ address: parsed, provider: 'google' })
        }
        // OVER_QUERY_LIMIT / REQUEST_DENIED / ZERO_RESULTS → fall through.
      }
    } catch {
      // Network / parse error → fall through to Photon.
    }
  }

  // --- Photon fallback -------------------------------------------------------
  try {
    const url = new URL('https://photon.komoot.io/api/')
    url.searchParams.set('q', address)
    url.searchParams.set('limit', '1')
    url.searchParams.set('lang', 'en')
    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) throw new Error('PHOTON_HTTP_' + res.status)
    const data = await res.json() as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      features?: any[]
    }
    const feat = (data.features || [])[0]
    if (feat) {
      const coords: [number, number] | null =
        Array.isArray(feat.geometry?.coordinates) && feat.geometry.coordinates.length === 2
          ? [feat.geometry.coordinates[0], feat.geometry.coordinates[1]]
          : null
      const parsed: ParsedAddress = parsePhotonFeature(feat.properties || {}, coords)
      return NextResponse.json({ address: parsed, provider: 'photon' })
    }
  } catch {
    // ignore — fall through to "no result"
  }

  return NextResponse.json(
    { address: { ...EMPTY_PARSED_ADDRESS, formatted_address: address }, provider: null },
    { status: 404 }
  )
}
