import { NextRequest, NextResponse } from 'next/server'
import { requireUser, badRequest, serverError } from '../../../../../lib/server-auth'
import { getStripe, isStripeConfigured } from '../../../../../lib/stripe'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

/**
 * Prewired one-time platform purchase endpoint (blueprint:
 * "Accept a one-time payment with Checkout").
 *
 * Creates a Stripe Checkout Session in payment mode on the PLATFORM
 * account (not a connected contractor account). Use this for fees that
 * Prolink charges contractors directly — setup fees, add-ons, premium
 * templates, etc.
 *
 * Two ways to call it:
 *   1. Reference a pre-created Price by lookup_key:
 *      { purchase_type: 'setup_fee', lookup_key: 'setup_fee_onetime' }
 *   2. Inline price (creates an ad-hoc price for that session):
 *      { purchase_type: 'addon_xyz', product_name: 'XYZ Add-on',
 *        amount_cents: 4900 }
 *
 * On success the webhook handler inserts into one_time_purchases.
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
  const purchaseType = body?.purchase_type as string | undefined
  const lookupKey = body?.lookup_key as string | undefined
  const productName = body?.product_name as string | undefined
  const amountCents = typeof body?.amount_cents === 'number' ? body.amount_cents : undefined
  const successPath = (body?.success_path as string | undefined) || '/dashboard?purchase=1'
  const cancelPath = (body?.cancel_path as string | undefined) || '/dashboard?purchase_cancelled=1'

  if (!purchaseType) return badRequest('Missing purchase_type.')
  if (!lookupKey && (!productName || !amountCents)) {
    return badRequest('Provide either lookup_key, or product_name + amount_cents.')
  }

  const stripe = getStripe()

  // Resolve the Price: by lookup_key, or build an inline price_data entry.
  let lineItem: { price?: string; price_data?: { currency: string; unit_amount: number; product_data: { name: string } }; quantity: number }
  if (lookupKey) {
    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
    const price = prices.data[0]
    if (!price) return badRequest(`No active Stripe price with lookup_key="${lookupKey}".`)
    lineItem = { price: price.id, quantity: 1 }
  } else {
    lineItem = {
      price_data: {
        currency: 'usd',
        unit_amount: amountCents!,
        product_data: { name: productName! },
      },
      quantity: 1,
    }
  }

  // Reuse the platform Stripe Customer (created during subscription, or
  // create one now if the contractor doesn't have a subscription yet).
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
    mode: 'payment',
    customer: stripeCustomerId,
    line_items: [lineItem],
    payment_intent_data: {
      metadata: { contractor_id: user.id, purchase_type: purchaseType },
    },
    metadata: {
      contractor_id: user.id,
      purchase_type: purchaseType,
      ...(body?.metadata && typeof body.metadata === 'object' ? body.metadata : {}),
    },
    success_url: `${SITE_URL}${successPath}${successPath.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}${cancelPath}`,
  })

  return NextResponse.json({ url: session.url, id: session.id })
}
