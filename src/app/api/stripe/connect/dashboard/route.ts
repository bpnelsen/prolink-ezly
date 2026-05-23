import { NextRequest, NextResponse } from 'next/server'
import { requireUser, badRequest, serverError } from '@/lib/server-auth'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

/**
 * POST /api/stripe/connect/dashboard
 *
 * Returns a Stripe-hosted Express Dashboard login link. Used after
 * onboarding completes so contractors can view balances, payouts, and
 * update their bank account / personal details.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { user, supabase } = auth

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json(
      { error: 'stripe_not_configured', message: 'Stripe is not configured yet.' },
      { status: 501 }
    )
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single()

  if (!customer?.stripe_account_id) {
    return badRequest('Connect onboarding hasn’t started yet.')
  }

  try {
    const link = await stripe.accounts.createLoginLink(customer.stripe_account_id)
    return NextResponse.json({ data: { url: link.url } })
  } catch (err) {
    return serverError(
      'Could not open the Stripe dashboard',
      err instanceof Error ? err.message : String(err)
    )
  }
}
