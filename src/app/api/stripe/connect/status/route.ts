import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server-auth'

export const runtime = 'nodejs'

/**
 * GET /api/stripe/connect/status
 *
 * Returns the contractor's current Stripe Connect onboarding state from the
 * DB. The webhook keeps this in sync with Stripe via `account.updated`; the
 * UI calls this on mount and after returning from Stripe-hosted onboarding.
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { user, supabase } = auth

  const { data } = await supabase
    .from('customers')
    .select(
      'stripe_account_id, stripe_account_status, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted'
    )
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    data: {
      hasAccount: Boolean(data?.stripe_account_id),
      status: data?.stripe_account_status || 'pending',
      chargesEnabled: data?.stripe_charges_enabled ?? false,
      payoutsEnabled: data?.stripe_payouts_enabled ?? false,
      detailsSubmitted: data?.stripe_details_submitted ?? false,
    },
  })
}
