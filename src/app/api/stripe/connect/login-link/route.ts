import { NextRequest, NextResponse } from 'next/server'
import { requireUser, badRequest } from '../../../../../lib/server-auth'
import { getStripe, isStripeConfigured } from '../../../../../lib/stripe'

/**
 * Mints a one-time login URL into the contractor's Stripe Express Dashboard
 * (where they can see balance, payouts, payout schedule, transactions, etc.)
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'stripe_not_configured', message: 'Stripe is not configured on the server.' },
      { status: 501 },
    )
  }

  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { user, supabase } = auth

  const { data: contractor } = await supabase
    .from('customers')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single()

  if (!contractor?.stripe_account_id) {
    return badRequest('Stripe account not connected yet.')
  }

  const stripe = getStripe()
  const link = await stripe.accounts.createLoginLink(contractor.stripe_account_id)
  return NextResponse.json({ url: link.url })
}
