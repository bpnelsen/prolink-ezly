import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe, VOLUME_WAIVER_THRESHOLD } from '../../../../lib/stripe-server'
import { createServiceRoleClient } from '../../../../lib/supabase-server'
import { sendSmsNotification } from '../../../../lib/twilio-service'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') || ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET || '')
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature failed: ${err}` }, { status: 400 })
  }

  const db = createServiceRoleClient()

  // ── Customer pays invoice ──────────────────────────────────────────────────
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    const { invoice_id, invoice_number, contractor_id, client_id } = pi.metadata
    if (!invoice_id) return NextResponse.json({ received: true })

    const amountPaid = pi.amount / 100
    const feeAmount = pi.application_fee_amount ? pi.application_fee_amount / 100 : 0

    await db.from('payments').insert({
      invoice_id,
      contractor_id,
      amount: amountPaid,
      payment_method: 'online',
      reference_number: pi.id,
      stripe_payment_intent_id: pi.id,
      prolink_fee_amount: feeAmount,
      paid_at: new Date().toISOString(),
      notes: 'Paid online via Stripe',
    })

    const { data: inv } = await db
      .from('invoices')
      .select('total, amount_paid')
      .eq('id', invoice_id)
      .single()

    if (inv) {
      const newAmountPaid = Number(inv.amount_paid) + amountPaid
      const newBalance = Math.max(0, Number(inv.total) - newAmountPaid)
      await db.from('invoices').update({
        amount_paid: newAmountPaid,
        balance_due: newBalance,
        status: newBalance <= 0 ? 'paid' : 'partially_paid',
        ...(newBalance <= 0 ? { paid_at: new Date().toISOString() } : {}),
      }).eq('id', invoice_id)
    }

    const [{ data: client }, { data: contractor }] = await Promise.all([
      db.from('clients').select('first_name, last_name, phone').eq('id', client_id).single(),
      db.from('customers').select('business_name, phone').eq('id', contractor_id).single(),
    ])

    const fmt = `$${amountPaid.toFixed(2)}`
    const clientName = client ? `${client.first_name} ${client.last_name}` : 'Customer'

    if (contractor?.phone) {
      await sendSmsNotification(
        contractor.phone,
        `Prolink: Payment of ${fmt} received for Invoice #${invoice_number} from ${clientName}.`,
      )
    }
    if (client?.phone) {
      await sendSmsNotification(
        client.phone,
        `Payment of ${fmt} confirmed for Invoice #${invoice_number} from ${contractor?.business_name || 'your contractor'}. Thank you!`,
      )
    }
  }

  // ── Stripe Connect account verified / updated ──────────────────────────────
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account
    const status = account.charges_enabled
      ? 'active'
      : account.details_submitted
        ? 'pending'
        : 'not_connected'
    await db
      .from('customers')
      .update({ stripe_connect_status: status })
      .eq('stripe_account_id', account.id)
  }

  // ── Subscription invoice created — check volume waiver ────────────────────
  if (event.type === 'invoice.created') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inv = event.data.object as any as Stripe.Invoice & { subscription?: string | null }
    if (!inv.subscription || !inv.customer || inv.amount_due <= 0) {
      return NextResponse.json({ received: true })
    }

    const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer.id
    const { data: contractor } = await db
      .from('customers')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (contractor) {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

      const { data: monthPayments } = await db
        .from('payments')
        .select('amount')
        .eq('contractor_id', contractor.id)
        .gte('paid_at', monthStart)
        .lte('paid_at', monthEnd)

      const totalVolume = (monthPayments || []).reduce((sum, p) => sum + Number(p.amount), 0)

      if (totalVolume >= VOLUME_WAIVER_THRESHOLD) {
        // Add a negative line item to zero out the invoice before it finalizes
        await stripe.invoiceItems.create({
          customer: customerId,
          amount: -(inv.amount_due),
          currency: inv.currency,
          description: `Prolink volume reward — $${totalVolume.toFixed(2)} processed this month`,
          invoice: inv.id,
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}
