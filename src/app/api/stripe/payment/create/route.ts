import { NextRequest, NextResponse } from 'next/server'
import { stripe, PROLINK_FEE_PERCENT } from '../../../../../lib/stripe-server'
import { createServiceRoleClient } from '../../../../../lib/supabase-server'

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Missing invoice token' }, { status: 400 })

  const db = createServiceRoleClient()

  const { data: invoice } = await db
    .from('invoices')
    .select('id, balance_due, total, contractor_id, client_id, invoice_number')
    .eq('public_token', token)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (Number(invoice.balance_due) <= 0) return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })

  const { data: contractor } = await db
    .from('customers')
    .select('stripe_account_id, stripe_connect_status')
    .eq('id', invoice.contractor_id)
    .single()

  if (!contractor?.stripe_account_id || contractor.stripe_connect_status !== 'active') {
    return NextResponse.json({ error: 'Online payments not enabled for this contractor' }, { status: 400 })
  }

  const amountCents = Math.round(Number(invoice.balance_due) * 100)
  const applicationFeeCents = Math.round(amountCents * PROLINK_FEE_PERCENT)

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    application_fee_amount: applicationFeeCents,
    transfer_data: { destination: contractor.stripe_account_id },
    metadata: {
      invoice_id: invoice.id,
      invoice_number: String(invoice.invoice_number),
      contractor_id: invoice.contractor_id,
      client_id: invoice.client_id || '',
    },
  })

  return NextResponse.json({ clientSecret: paymentIntent.client_secret })
}
