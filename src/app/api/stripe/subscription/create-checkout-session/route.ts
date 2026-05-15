import { NextRequest, NextResponse } from 'next/server'
import { requireUser, badRequest, serverError } from '../../../../../lib/server-auth'
import { getStripe, isStripeConfigured } from '../../../../../lib/stripe'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const TRIAL_DAYS = Number(process.env.STRIPE_TRIAL_DAYS || 14)

/**
 * Creates a Stripe Checkout Session in subscription mode for the Prolink
 * platform plan (Starter / Pro / Business). This is billed to the
 * PLATFORM account, not a connected account — different from invoice
 * payments which use Connect direct charges.
 *
 * Body: { lookup_key: 'starter_monthly' | 'pro_monthly' | 'business_monthly' }
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

  const body = await req.json().catch(() => ({}))
  const lookupKey = body?.lookup_key as string | undefined
  if (!lookupKey) return badRequest('Missing lookup_key.')

  const stripe = getStripe()

  // Resolve the active Price by lookup_key (created in Stripe Dashboard or CLI).
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
  const price = prices.data[0]
  if (!price) {
    return badRequest(`No active Stripe price with lookup_key="${lookupKey}". Create it in your Stripe dashboard.`)
  }

  // Ensure the contractor has a Stripe Customer on the PLATFORM account.
  const { data: contractor } = await supabase
    .from('customers')
    .select('stripe_customer_id, business_name')
    .eq('id', user.id)
    .maybeSingle()

  let stripeCustomerId = contractor?.stripe_customer_id || null
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: contractor?.business_name || undefined,
      metadata: { contractor_id: user.id },
    })
    stripeCustomerId = customer.id
    const { error: upsertErr } = await supabase
      .from('customers')
      .upsert({ id: user.id, stripe_customer_id: stripeCustomerId })
    if (upsertErr) return serverError('Could not save Stripe customer id', upsertErr.message)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: price.id, quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { contractor_id: user.id, lookup_key: lookupKey },
    },
    allow_promotion_codes: true,
    success_url: `${SITE_URL}/settings/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/settings/billing?canceled=1`,
    metadata: { contractor_id: user.id, lookup_key: lookupKey },
  })

  return NextResponse.json({ url: session.url, id: session.id })
}
