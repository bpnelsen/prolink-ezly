import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serverError } from '@/lib/server-auth'
import { getStripe, billingConfigured, STRIPE_BASE_PRICE_ID, STRIPE_SEAT_PRICE_ID, PRICING } from '@/lib/stripe'

export const runtime = 'nodejs'

/**
 * POST /api/stripe/subscription  Body: { seats }
 * Starts (or restarts) the single $49/mo + $15/extra-seat subscription via
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
          'Subscription billing is not configured yet (set STRIPE_SECRET_KEY, STRIPE_BASE_PRICE_ID, STRIPE_SEAT_PRICE_ID).',
      },
      { status: 501 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const { data: customer } = await supabase
    .from('customers')
    .select('id, business_name, stripe_customer_id, seats')
    .eq('id', user.id)
    .single()

  const seats = Math.max(1, Math.floor(Number(body?.seats ?? customer?.seats ?? 1)))
  const extraSeats = seats - 1

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

    const lineItems: { price: string; quantity: number }[] = [
      { price: STRIPE_BASE_PRICE_ID, quantity: 1 },
    ]
    if (extraSeats > 0) lineItems.push({ price: STRIPE_SEAT_PRICE_ID, quantity: extraSeats })

    const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: lineItems,
      subscription_data: {
        trial_period_days: PRICING.trialDays,
        metadata: { app_user_id: user.id, seats: String(seats) },
      },
      allow_promotion_codes: true,
      success_url: `${origin}/settings/billing?checkout=success`,
      cancel_url: `${origin}/settings/billing?checkout=cancelled`,
    })

    // Persist the intended seat count immediately (webhook will confirm).
    await supabase.from('customers').update({ seats }).eq('id', user.id)

    return NextResponse.json({ data: { url: session.url } })
  } catch (err) {
    return serverError('Could not start checkout', err instanceof Error ? err.message : String(err))
  }
}
