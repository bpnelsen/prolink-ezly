import { NextRequest, NextResponse } from 'next/server'
import { requireUser, notFound, serverError } from '../../../../../../lib/server-auth'

export const runtime = 'nodejs'

/**
 * POST /api/v1/invoices/:id/public-link
 *
 * Returns the shareable customer-facing URL for an invoice, lazily
 * generating a public_token if the row doesn't have one yet. This lets
 * the "View as Customer" and "Copy Portal Link" actions self-heal old
 * invoices that pre-date the public_token default — they would
 * otherwise render /invoice/undefined and show "Invoice not found".
 *
 * RLS scopes the lookup to invoices owned by the calling contractor.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const { data: invoice, error: readErr } = await supabase
    .from('invoices')
    .select('id, public_token')
    .eq('id', params.id)
    .maybeSingle()
  if (readErr) return serverError('Could not load invoice', readErr.message)
  if (!invoice) return notFound('Invoice not found')

  let token = invoice.public_token
  if (!token) {
    // crypto.randomUUID is available in Node 19+ and the Next.js edge/node
    // runtimes; matches the Postgres gen_random_uuid() format.
    token = crypto.randomUUID()
    const { error: updErr } = await supabase
      .from('invoices')
      .update({ public_token: token })
      .eq('id', invoice.id)
    if (updErr) return serverError('Could not assign portal link', updErr.message)
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
  return NextResponse.json({ data: { url: `${base}/invoice/${token}`, token } })
}
