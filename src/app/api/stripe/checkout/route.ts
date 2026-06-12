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
 * The charge lands on Prolink's platform balance — per
 * docs/stripe-connect.md (separate charges and transfers). P1.3 will issue
 * the Transfer to the contractor's connected account on job completion,
 * keyed off the transfer_group set here.
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

  // Pull the contractor's business name for the Checkout line description.
  const { data: contractor } = await svc
    .from('customers')
    .select('business_name')
    .eq('id', invoice.contractor_id)
    .maybeSingle()

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: contractor?.business_name || undefined,
            },
            unit_amount: Math.round(balance * 100),
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        description: `Invoice ${invoice.invoice_number}`,
        // transfer_group links this charge to a future Transfer to the
        // contractor's connected account (P1.3 — release on job completion).
        transfer_group: `invoice_${invoice.id}`,
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
    })

    return NextResponse.json({ data: { url: session.url }, url: session.url })
  } catch (err) {
    return serverError(
      'Could not start checkout',
      err instanceof Error ? err.message : String(err)
    )
  }
}
