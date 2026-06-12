import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { serviceClient, badRequest, notFound, serverError } from '@/lib/server-auth'

export const runtime = 'nodejs'

/**
 * POST /api/stripe/checkout  Body: { invoiceId }
 *
 * Public endpoint — invoked from the tokenized invoice viewer
 * (/invoice/[token]) and from /api/v1/portal/invoices/[id]/pay. The invoice
 * UUID acts as a bearer credential, same threat model as the existing
 * public_token. We re-derive the amount from the DB; the client-supplied
 * amount is ignored.
 *
 * Charge model: direct charges on the contractor's Connect Express
 * account. The Checkout Session is created via stripeAccount, so funds
 * land directly in the contractor's Stripe balance — they never touch
 * Prolink's. Prolink is not merchant of record; chargebacks and refunds
 * are the contractor's. This supersedes the separate-charges-and-transfers
 * plan in docs/stripe-connect.md (see the revised-decision note there).
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json(
      {
        error: 'stripe_not_configured',
        message: 'Online payments are not yet enabled. Please contact your contractor to arrange payment via cash, check, or bank transfer.',
      },
      { status: 501 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const invoiceId = typeof body?.invoiceId === 'string' ? body.invoiceId : ''
  if (!invoiceId) return badRequest('invoiceId is required.')

  const svc = serviceClient()
  const { data: invoice } = await svc
    .from('invoices')
    .select('id, contractor_id, invoice_number, total, balance_due, status, public_token')
    .eq('id', invoiceId)
    .maybeSingle()

  if (!invoice) return notFound('Invoice not found')
  if (invoice.status === 'cancelled') return badRequest('This invoice has been cancelled.')
  const balance = Number(invoice.balance_due)
  if (!(balance > 0)) return badRequest('This invoice has no balance due.')

  const { data: contractor } = await svc
    .from('customers')
    .select('business_name, stripe_account_id, stripe_charges_enabled')
    .eq('id', invoice.contractor_id)
    .maybeSingle()

  if (!contractor?.stripe_account_id || !contractor.stripe_charges_enabled) {
    return NextResponse.json(
      {
        error: 'contractor_not_onboarded',
        message: 'This contractor hasn’t finished setting up online payments yet. Please contact them to arrange payment another way.',
      },
      { status: 400 }
    )
  }

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Invoice ${invoice.invoice_number}`,
                description: contractor.business_name || undefined,
              },
              unit_amount: Math.round(balance * 100),
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          description: `Invoice ${invoice.invoice_number}`,
          metadata: {
            invoice_id: invoice.id,
            contractor_id: invoice.contractor_id,
          },
        },
        metadata: {
          invoice_id: invoice.id,
          contractor_id: invoice.contractor_id,
        },
        success_url: `${origin}/invoice/${invoice.public_token}?payment=success`,
        cancel_url: `${origin}/invoice/${invoice.public_token}?payment=cancelled`,
      },
      { stripeAccount: contractor.stripe_account_id }
    )

    return NextResponse.json({ data: { url: session.url }, url: session.url })
  } catch (err) {
    return serverError(
      'Could not start checkout',
      err instanceof Error ? err.message : String(err)
    )
  }
}
