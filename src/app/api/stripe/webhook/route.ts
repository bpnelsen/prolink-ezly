import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe, isStripeConfigured } from '../../../../lib/stripe'
import { serviceClient } from '../../../../lib/server-auth'

export const runtime = 'nodejs'
// Stripe needs the raw body for signature verification, so disable any
// implicit body parsing/caching.
export const dynamic = 'force-dynamic'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''
const CONNECT_WEBHOOK_SECRET = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || ''

/**
 * Single endpoint that accepts both the platform webhook and the Connect
 * webhook. We try the platform secret first, then the Connect secret. Stripe
 * dashboard should register two endpoints pointing at this URL: one with
 * "Listen to events on your account" (uses STRIPE_WEBHOOK_SECRET) and one
 * with "Listen to events from Connected accounts" (uses
 * STRIPE_CONNECT_WEBHOOK_SECRET).
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 501 })
  }

  const sig = req.headers.get('stripe-signature') || ''
  const rawBody = await req.text()
  const stripe = getStripe()

  let event: Stripe.Event | null = null
  let lastErr: unknown = null
  for (const secret of [WEBHOOK_SECRET, CONNECT_WEBHOOK_SECRET].filter(Boolean)) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, secret)
      break
    } catch (err) {
      lastErr = err
    }
  }
  if (!event) {
    return NextResponse.json(
      { error: 'invalid_signature', detail: String(lastErr) },
      { status: 400 },
    )
  }

  const supabase = serviceClient()

  try {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        await supabase
          .from('customers')
          .update({
            stripe_charges_enabled: account.charges_enabled,
            stripe_payouts_enabled: account.payouts_enabled,
            stripe_details_submitted: account.details_submitted,
            stripe_account_country: account.country || null,
            stripe_account_synced_at: new Date().toISOString(),
          })
          .eq('stripe_account_id', account.id)
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.payment_status !== 'paid') break
        await recordPayment(supabase, stripe, session, event.account || null)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        if (!charge.payment_intent) break
        const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent.id
        const { data: payment } = await supabase
          .from('payments')
          .select('id, invoice_id, amount')
          .eq('stripe_payment_intent_id', piId)
          .single()
        if (payment) {
          // Roll back the invoice totals by the refunded amount.
          const refundedDollars = (charge.amount_refunded || 0) / 100
          const { data: inv } = await supabase
            .from('invoices')
            .select('amount_paid, total')
            .eq('id', payment.invoice_id)
            .single()
          if (inv) {
            const newPaid = Math.max(0, Number(inv.amount_paid) - refundedDollars)
            const newBalance = Math.max(0, Number(inv.total) - newPaid)
            await supabase
              .from('invoices')
              .update({
                amount_paid: newPaid,
                balance_due: newBalance,
                status: newBalance > 0 ? 'sent' : 'paid',
                paid_at: newBalance > 0 ? null : new Date().toISOString(),
              })
              .eq('id', payment.invoice_id)
          }
        }
        break
      }

      default:
        // Ignore other events for now.
        break
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'handler_failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}

async function recordPayment(
  supabase: ReturnType<typeof serviceClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  connectedAccountId: string | null,
) {
  const invoiceId = session.metadata?.invoice_id
  const contractorId = session.metadata?.contractor_id
  if (!invoiceId || !contractorId) return

  // Fetch the underlying PaymentIntent (via the connected account) so we can
  // capture the charge id and the application fee actually collected.
  const pi = session.payment_intent
    ? await stripe.paymentIntents.retrieve(
        typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id,
        { expand: ['latest_charge'] },
        connectedAccountId ? { stripeAccount: connectedAccountId } : undefined,
      )
    : null

  const charge = pi?.latest_charge && typeof pi.latest_charge !== 'string' ? pi.latest_charge : null
  const amountCents = session.amount_total || pi?.amount || 0
  const amountDollars = amountCents / 100
  const applicationFeeCents = pi?.application_fee_amount ?? 0
  const stripeFeeCents = charge?.balance_transaction
    ? null // would need a separate balance_transactions retrieve to populate
    : null

  // Idempotent insert keyed on stripe_checkout_session_id (unique index).
  const { error: insertErr } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoiceId,
      contractor_id: contractorId,
      amount: amountDollars,
      payment_method: 'stripe',
      reference_number: charge?.id || pi?.id || session.id,
      stripe_payment_intent_id: pi?.id || null,
      stripe_charge_id: charge?.id || null,
      stripe_checkout_session_id: session.id,
      stripe_application_fee_amount: applicationFeeCents,
      stripe_fee_amount: stripeFeeCents,
      paid_at: new Date().toISOString(),
    })

  // 23505 = unique_violation: webhook replay, payment already recorded.
  if (insertErr && insertErr.code !== '23505') {
    throw insertErr
  }
  if (insertErr) return // duplicate; nothing more to do

  // Update invoice totals.
  const { data: inv } = await supabase
    .from('invoices')
    .select('amount_paid, total')
    .eq('id', invoiceId)
    .single()
  if (inv) {
    const newPaid = Number(inv.amount_paid) + amountDollars
    const newBalance = Math.max(0, Number(inv.total) - newPaid)
    await supabase
      .from('invoices')
      .update({
        amount_paid: newPaid,
        balance_due: newBalance,
        status: newBalance <= 0 ? 'paid' : 'partial',
        paid_at: newBalance <= 0 ? new Date().toISOString() : null,
      })
      .eq('id', invoiceId)
  }
}
