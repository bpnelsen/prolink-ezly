import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serverError } from '../../../../../lib/server-auth'
import { getStripe, isStripeConfigured } from '../../../../../lib/stripe'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

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

  const stripe = getStripe()

  const { data: contractor } = await supabase
    .from('customers')
    .select('stripe_account_id, business_name')
    .eq('id', user.id)
    .maybeSingle()

  let accountId = contractor?.stripe_account_id || null

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: user.email || undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        name: contractor?.business_name || undefined,
        support_email: user.email || undefined,
      },
      metadata: { contractor_id: user.id },
    })
    accountId = account.id

    const { error: upsertErr } = await supabase
      .from('customers')
      .upsert({
        id: user.id,
        stripe_account_id: accountId,
        stripe_account_country: account.country || 'US',
        stripe_account_synced_at: new Date().toISOString(),
      })
    if (upsertErr) return serverError('Could not save Stripe account id', upsertErr.message)
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${SITE_URL}/api/stripe/connect/refresh`,
    return_url: `${SITE_URL}/settings/payments?onboarded=1`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: link.url })
}
