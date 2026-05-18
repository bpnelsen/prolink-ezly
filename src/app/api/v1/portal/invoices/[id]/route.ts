import { NextRequest, NextResponse } from 'next/server'
import { requireClient, notFound } from '../../../../../../lib/server-auth'

/** GET /api/v1/portal/invoices/:id — one of the caller's invoices + detail. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireClient(req)
  if ('error' in auth) return auth.error
  const { supabase, clientIds } = auth

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (!invoice || !invoice.client_id || !clientIds.includes(invoice.client_id)) {
    return notFound('Invoice not found')
  }

  const [{ data: lineItems }, { data: payments }, { data: biz }] = await Promise.all([
    supabase.from('invoice_line_items').select('*').eq('invoice_id', invoice.id).order('position'),
    supabase.from('payments').select('*').eq('invoice_id', invoice.id).order('paid_at', { ascending: false }),
    supabase.from('customers').select('business_name, logo_url, phone').eq('id', invoice.contractor_id).maybeSingle(),
  ])

  return NextResponse.json({
    data: { invoice, line_items: lineItems || [], payments: payments || [], business: biz || {} },
  })
}
