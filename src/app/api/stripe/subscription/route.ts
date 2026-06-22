import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serverError } from '@/lib/server-auth'
import { getStripe, billingConfigured, STRIPE_BASE_PRICE_ID, PRICING } from '@/lib/stripe'

export const runtime = 'nodejs'

/**
 * POST /api/stripe/subscription
 * Starts (or restarts) the flat $49/mo subscription (unlimited seats) via
 * a Stripe Checkout Session with a 14-day trial. Returns the hosted URL.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { user, supabase } = auth

  const stripe = getStripe()
  if (!stripe || !billingConfigured()) {
    return NextResponse.json(
      {
        error: 'stripe_not_configured',
        message:
          'Subscription billing is not configured yet (set STRIPE_SECRET_KEY and STRIPE_BASE_PRICE_ID).',
      },
      { status: 501 }
    )
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('id, business_name, stripe_customer_id')
    .eq('id', user.id)
    .single()

  try {
    // Reuse or create the Stripe customer.
    let stripeCustomerId = customer?.stripe_customer_id || ''
    if (!stripeCustomerId) {
      const c = await stripe.customers.create({
        email: user.email || undefined,
        name: customer?.business_name || undefined,
        metadata: { app_user_id: user.id },
      })
      stripeCustomerId = c.id
      await supabase.from('customers').update({ stripe_customer_id: stripeCustomerId }).eq('id', user.id)
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: STRIPE_BASE_PRICE_ID, quantity: 1 }],
      subscription_data: {
        trial_period_days: PRICING.trialDays,
        metadata: { app_user_id: user.id },
      },
      allow_promotion_codes: true,
      success_url: `${origin}/settings/billing?checkout=success`,
      cancel_url: `${origin}/settings/billing?checkout=cancelled`,
    })

    return NextResponse.json({ data: { url: session.url } })
  } catch (err) {
    return serverError('Could not start checkout', err instanceof Error ? err.message : String(err))
  }
}
