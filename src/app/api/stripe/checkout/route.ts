import { NextRequest, NextResponse } from 'next/server'
import { calcApplicationFee, getStripe, isStripeConfigured } from '../../../../lib/stripe'
import { serviceClient } from '../../../../lib/server-auth'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

/**
 * Public endpoint called from the customer-facing invoice page.
 * Creates a Stripe Checkout Session as a DIRECT CHARGE on the contractor's
 * connected Express account, with a platform application fee to Prolink.
 *
 * Body: { token: string }   // public_token from invoices table
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error: 'stripe_not_configured',
        message: 'Online payments are not yet enabled. Please contact your contractor to arrange payment via cash, check, or bank transfer.',
      },
      { status: 501 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const token = body?.token as string | undefined
  if (!token) {
    return NextResponse.json({ error: 'bad_request', message: 'Missing invoice token.' }, { status: 400 })
  }

  const supabase = serviceClient()

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .select('id, contractor_id, invoice_number, balance_due, status, public_token')
    .eq('public_token', token)
    .single()

  if (invErr || !invoice) {
    return NextResponse.json({ error: 'not_found', message: 'Invoice not found.' }, { status: 404 })
  }

  const balanceDueCents = Math.round(Number(invoice.balance_due) * 100)
  if (balanceDueCents <= 0) {
    return NextResponse.json({ error: 'already_paid', message: 'This invoice is already paid.' }, { status: 400 })
  }
  if (invoice.status === 'cancelled') {
    return NextResponse.json({ error: 'cancelled', message: 'This invoice has been cancelled.' }, { status: 400 })
  }

  const { data: contractor } = await supabase
    .from('customers')
    .select('stripe_account_id, stripe_charges_enabled, business_name')
    .eq('id', invoice.contractor_id)
    .single()

  if (!contractor?.stripe_account_id || !contractor.stripe_charges_enabled) {
    return NextResponse.json(
      {
        error: 'contractor_not_ready',
        message: 'This contractor has not yet enabled online payments. Please contact them to pay by cash, check, or bank transfer.',
      },
      { status: 503 },
    )
  }

  const stripe = getStripe()

  // Direct charge: pass `stripeAccount` so the session is created on the
  // contractor's connected account. Funds settle to them; Stripe fees come
  // off their balance; the application_fee_amount transfers to Prolink.
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      payment_method_types: ['card', 'klarna', 'afterpay_clearpay'],
      // Apple Pay / Google Pay ride along automatically with 'card' on
      // browsers that support them; no separate type needed.
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: balanceDueCents,
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: contractor.business_name || undefined,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: calcApplicationFee(balanceDueCents),
        metadata: {
          invoice_id: invoice.id,
          contractor_id: invoice.contractor_id,
        },
      },
      metadata: {
        invoice_id: invoice.id,
        contractor_id: invoice.contractor_id,
        public_token: invoice.public_token,
      },
      success_url: `${SITE_URL}/invoice/${token}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/invoice/${token}?cancelled=1`,
    },
    { stripeAccount: contractor.stripe_account_id },
  )

  return NextResponse.json({ url: session.url, id: session.id })
}
