import { NextRequest, NextResponse } from 'next/server'
import { requireClient, notFound } from '../../../../../../../lib/server-auth'

/**
 * POST /api/v1/portal/invoices/:id/pay
 * Verifies the invoice belongs to the caller, then hands off to Stripe
 * checkout. The Stripe integration is still a stub server-side; this route
 * returns its message so the portal can show the right state.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireClient(req)
  if ('error' in auth) return auth.error
  const { supabase, clientIds } = auth

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, client_id, balance_due, status')
    .eq('id', params.id)
    .maybeSingle()
  if (!invoice || !invoice.client_id || !clientIds.includes(invoice.client_id)) {
    return notFound('Invoice not found')
  }

  const origin = req.nextUrl.origin
  const res = await fetch(`${origin}/api/stripe/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoiceId: invoice.id, amount: invoice.balance_due }),
  }).catch(() => null)

  const payload = res ? await res.json().catch(() => ({})) : {}
  // Surface whatever Stripe checkout returned (URL when live, message while stubbed).
  return NextResponse.json({ data: payload }, { status: res?.ok ? 200 : 200 })
}
