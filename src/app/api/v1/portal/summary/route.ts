import { NextRequest, NextResponse } from 'next/server'
import { requireClient } from '../../../../../lib/server-auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

/** GET /api/v1/portal/summary — everything the portal dashboard needs. */
export async function GET(req: NextRequest) {
  const auth = await requireClient(req)
  if ('error' in auth) return auth.error
  const { supabase, clientIds } = auth

  if (clientIds.length === 0) {
    return NextResponse.json({ data: { businesses: {}, invoices: [], conversations: [], contracts: [], linked: false } })
  }

  const [{ data: links }, { data: invoices }, { data: conversations }, { data: contracts }] =
    await Promise.all([
      supabase
        .from('client_links')
        .select('client_id, contractor_id, clients(first_name, last_name)')
        .eq('portal_user_id', auth.user.id),
      supabase
        .from('invoices')
        .select('id, invoice_number, status, total, balance_due, issue_date, due_date, contractor_id')
        .in('client_id', clientIds)
        .order('issue_date', { ascending: false }),
      supabase
        .from('conversations')
        .select('id, job_id, last_message_at, contractor_id, jobs(title)')
        .in('client_id', clientIds)
        .order('last_message_at', { ascending: false }),
      supabase
        .from('contracts')
        .select('id, contract_number, status, contract_sum, created_at, contractor_id')
        .in('client_id', clientIds)
        .order('created_at', { ascending: false }),
    ])

  // Resolve contractor business names for display.
  const contractorIds = Array.from(
    new Set([
      ...(invoices || []).map((i: Row) => i.contractor_id),
      ...(conversations || []).map((c: Row) => c.contractor_id),
      ...(contracts || []).map((c: Row) => c.contractor_id),
      ...(links || []).map((l: Row) => l.contractor_id),
    ].filter(Boolean))
  )
  const businesses: Record<string, string> = {}
  if (contractorIds.length) {
    const { data: custs } = await supabase
      .from('customers')
      .select('id, business_name')
      .in('id', contractorIds)
    for (const c of custs || []) businesses[c.id] = c.business_name || 'Your Contractor'
  }

  return NextResponse.json({
    data: {
      linked: true,
      businesses,
      invoices: invoices || [],
      conversations: conversations || [],
      contracts: contracts || [],
    },
  })
}
