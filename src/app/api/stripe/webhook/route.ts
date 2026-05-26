import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { Resend } from 'resend'
import { getStripe, STRIPE_WEBHOOK_SECRET, STRIPE_SEAT_PRICE_ID } from '@/lib/stripe'
import { serviceClient } from '@/lib/server-auth'
import { sendSmsNotification } from '@/lib/twilio-service'

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

      // Alert on first paid activation: new subscription going active, or trial converting to active
      const isNewPaid = event.type === 'customer.subscription.created' && sub.status === 'active'
      const prev = (event.data as any).previous_attributes as Partial<Stripe.Subscription> | undefined
      const isTrialConversion = event.type === 'customer.subscription.updated'
        && sub.status === 'active'
        && prev?.status === 'trialing'

      if (isNewPaid || isTrialConversion) {
        firePaymentAlert(customerId, svc, isTrialConversion).catch(console.error)
      }
    }
  } catch {
    // Acknowledge anyway so Stripe doesn't hammer retries on a transient
    // DB hiccup; the next lifecycle event will reconcile.
    return NextResponse.json({ received: true, note: 'processing_error' })
  }

  return NextResponse.json({ received: true })
}

async function firePaymentAlert(
  stripeCustomerId: string,
  svc: ReturnType<typeof serviceClient>,
  isConversion: boolean,
) {
  const { data: customer } = await svc
    .from('customers')
    .select('business_name, user_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle()

  let email = ''
  let name = customer?.business_name || stripeCustomerId
  if (customer?.user_id) {
    const { data: profile } = await svc
      .from('profiles')
      .select('email, full_name')
      .eq('id', customer.user_id)
      .maybeSingle()
    email = profile?.email || ''
    name = customer.business_name || profile?.full_name || email || stripeCustomerId
  }

  const label = isConversion ? 'Trial converted to paid' : 'New paid subscription'
  const subject = `UseEzly: ${label} — ${name}`
  const text = `${label} on UseEzly.\n\nBusiness: ${name}\nEmail: ${email || '(unknown)'}\nStripe customer: ${stripeCustomerId}`
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#0F3A7D;margin-bottom:4px;">💳 ${label}</h2>
      <table style="border-collapse:collapse;width:100%;margin-top:12px;">
        <tr><td style="padding:6px 0;color:#555;width:100px;">Business</td><td style="padding:6px 0;font-weight:600;">${name}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Email</td><td style="padding:6px 0;">${email || '(unknown)'}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Stripe ID</td><td style="padding:6px 0;font-size:12px;">${stripeCustomerId}</td></tr>
      </table>
      <p style="margin-top:20px;"><a href="https://app.useezly.com/dashboard/admin" style="color:#0F3A7D;">View admin dashboard →</a></p>
    </div>`

  const adminEmail = process.env.CRM_FROM_EMAIL || 'Brian@useezly.com'
  const adminPhone = process.env.NOTIFY_PHONE_NUMBER || ''

  await Promise.allSettled([
    (async () => {
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) return
      const resend = new Resend(apiKey)
      await resend.emails.send({ from: adminEmail, to: adminEmail, subject, html, text })
    })(),
    adminPhone
      ? sendSmsNotification(adminPhone, `UseEzly: ${label} — ${name} (${email || stripeCustomerId})`)
      : Promise.resolve(),
  ])
}
