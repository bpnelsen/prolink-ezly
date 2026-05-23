import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serverError } from '@/lib/server-auth'
import { getStripe, deriveConnectStatus } from '@/lib/stripe'

export const runtime = 'nodejs'

/**
 * POST /api/stripe/connect/onboard
 *
 * Creates an Express connected account for the contractor (if one doesn't
 * exist yet), persists `stripe_account_id`, and returns a fresh
 * Stripe-hosted account link. Account links expire within minutes, so this
 * route is safe to call every time the user clicks "Connect" or
 * "Continue onboarding" — the existing account is reused.
 *
 * Decisions backing this: docs/stripe-connect.md
 *   - Express account type
 *   - country: 'US' (initial target market; international is open question 5)
 *   - capabilities: card_payments + transfers (required for separate
 *     charges and transfers — see Decision 2)
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { user, supabase } = auth

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json(
      {
        error: 'stripe_not_configured',
        message: 'Stripe is not configured yet (set STRIPE_SECRET_KEY).',
      },
      { status: 501 }
    )
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('stripe_account_id, business_name')
    .eq('id', user.id)
    .single()

  try {
    let accountId = customer?.stripe_account_id || ''

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: customer?.business_name
          ? { name: customer.business_name }
          : undefined,
        metadata: { app_user_id: user.id },
      })
      accountId = account.id
      await supabase
        .from('customers')
        .update({
          stripe_account_id: accountId,
          stripe_account_status: deriveConnectStatus(account),
          stripe_charges_enabled: account.charges_enabled ?? false,
          stripe_payouts_enabled: account.payouts_enabled ?? false,
          stripe_details_submitted: account.details_submitted ?? false,
        })
        .eq('id', user.id)
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/settings/payouts?onboarding=refresh`,
      return_url: `${origin}/settings/payouts?onboarding=return`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ data: { url: link.url } })
  } catch (err) {
    return serverError(
      'Could not start Stripe Connect onboarding',
      err instanceof Error ? err.message : String(err)
    )
  }
}
