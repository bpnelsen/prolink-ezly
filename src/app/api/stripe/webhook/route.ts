import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, STRIPE_WEBHOOK_SECRET, STRIPE_SEAT_PRICE_ID } from '@/lib/stripe'
import { serviceClient } from '@/lib/server-auth'

export const runtime = 'nodejs'

const STATUS_MAP: Record<string, string> = {
  trialing: 'trialing',
  active: 'active',
  past_due: 'past_due',
  unpaid: 'past_due',
  canceled: 'canceled',
  incomplete: 'incomplete',
  incomplete_expired: 'canceled',
  paused: 'paused',
}

function seatsFromSubscription(sub: Stripe.Subscription): number {
  let extra = 0
  for (const item of sub.items?.data || []) {
    if (item.price?.id === STRIPE_SEAT_PRICE_ID) extra += item.quantity || 0
  }
  return 1 + extra
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 501 })
  }

  const raw = await req.text()
  const sig = req.headers.get('stripe-signature') || ''
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_signature', message: err instanceof Error ? err.message : 'bad signature' },
      { status: 400 }
    )
  }

  const svc = serviceClient()

  try {
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      const deleted = event.type === 'customer.subscription.deleted'
      const status = deleted ? 'canceled' : STATUS_MAP[sub.status] || 'past_due'

      await svc
        .from('customers')
        .update({
          stripe_subscription_id: sub.id,
          subscription_status: status,
          plan: 'standard',
          plan_status: status === 'active' || status === 'trialing' ? 'active'
            : status === 'past_due' ? 'past_due'
            : 'cancelled',
          seats: seatsFromSubscription(sub),
          trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        })
        .eq('stripe_customer_id', customerId)
    }
  } catch {
    // Acknowledge anyway so Stripe doesn't hammer retries on a transient
    // DB hiccup; the next lifecycle event will reconcile.
    return NextResponse.json({ received: true, note: 'processing_error' })
  }

  return NextResponse.json({ received: true })
}
