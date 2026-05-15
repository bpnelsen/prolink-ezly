import { NextRequest, NextResponse } from 'next/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

/**
 * Stripe redirects here when an Account Link expires before the contractor
 * finishes onboarding. We just bounce them back to /settings/payments where
 * they can click "Continue onboarding" to mint a fresh link.
 */
export async function GET(_req: NextRequest) {
  return NextResponse.redirect(`${SITE_URL}/settings/payments?refresh=1`)
}
