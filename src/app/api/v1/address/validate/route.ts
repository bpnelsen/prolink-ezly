import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../../../lib/server-auth'

export const runtime = 'nodejs'

/**
 * POST /api/v1/address/validate
 * Body: { address_line1, address_line2?, city, state, zip_code, country? }
 *
 * Thin proxy to the Google Address Validation API. Keeps the key server-side
 * and degrades gracefully (returns verified:false) when no key is configured
 * or the upstream call fails, so the UI never hard-breaks on the keyless path.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'bad_request', message: 'Invalid JSON.' }, { status: 400 })

  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  if (!key) {
    return NextResponse.json({ data: { verified: false, available: false } })
  }

  const addressLines = [body.address_line1, body.address_line2].filter(Boolean)
  try {
    const r = await fetch(
      `https://addressvalidation.googleapis.com/v1:validateAddress?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: {
            regionCode: body.country || 'US',
            addressLines,
            locality: body.city || undefined,
            administrativeArea: body.state || undefined,
            postalCode: body.zip_code || undefined,
          },
        }),
      }
    )
    if (!r.ok) {
      return NextResponse.json({ data: { verified: false, available: true } })
    }
    const j = await r.json()
    const v = j?.result?.verdict || {}
    const geo = j?.result?.geocode?.location || {}
    const verified =
      v.addressComplete === true &&
      (v.validationGranularity === 'PREMISE' || v.validationGranularity === 'SUB_PREMISE')

    return NextResponse.json({
      data: {
        available: true,
        verified,
        has_unconfirmed: v.hasUnconfirmedComponents === true,
        has_inferred: v.hasInferredComponents === true,
        formatted: j?.result?.address?.formattedAddress || null,
        latitude: typeof geo.latitude === 'number' ? geo.latitude : null,
        longitude: typeof geo.longitude === 'number' ? geo.longitude : null,
        place_id: j?.result?.geocode?.placeId || null,
      },
    })
  } catch {
    return NextResponse.json({ data: { verified: false, available: true } })
  }
}
