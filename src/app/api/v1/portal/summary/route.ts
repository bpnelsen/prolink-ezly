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
    return NextResponse.json({
      data: {
        client: null,
        businesses: {},
        contractors: {},
        primary_contractor: null,
        invoices: [],
        jobs: [],
        conversations: [],
        contracts: [],
        unread_message_count: 0,
        linked: false,
      },
    })
  }

  const [
    { data: links },
    { data: clients },
    { data: invoices },
    { data: jobs },
    { data: conversations },
    { data: contracts },
  ] = await Promise.all([
    supabase
      .from('client_links')
      .select('client_id, contractor_id')
      .eq('portal_user_id', auth.user.id),
    supabase
      .from('clients')
      .select('id, first_name, last_name')
      .in('id', clientIds),
    supabase
      .from('invoices')
      .select('id, invoice_number, status, total, balance_due, issue_date, due_date, contractor_id')
      .in('client_id', clientIds)
      .order('issue_date', { ascending: false }),
    supabase
      .from('jobs')
      .select('id, title, status, trade, estimated_value, scheduled_start, created_at, contractor_id')
      .in('client_id', clientIds)
      .order('created_at', { ascending: false }),
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

  // Count unread contractor messages across the customer's conversations.
  // A message from the contractor with read_at IS NULL = unread for the
  // customer. Cheap aggregate scoped to the customer's conversation set.
  const conversationIds = (conversations || []).map((c: Row) => c.id)
  let unreadCount = 0
  if (conversationIds.length > 0) {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('sender_role', 'contractor')
      .is('read_at', null)
    unreadCount = count || 0
  }

  // Resolve contractor business name + contact info for display + card.
  const contractorIds = Array.from(
    new Set([
      ...(invoices || []).map((i: Row) => i.contractor_id),
      ...(jobs || []).map((j: Row) => j.contractor_id),
      ...(conversations || []).map((c: Row) => c.contractor_id),
      ...(contracts || []).map((c: Row) => c.contractor_id),
      ...(links || []).map((l: Row) => l.contractor_id),
    ].filter(Boolean))
  )
  const businesses: Record<string, string> = {}
  const contractors: Record<string, Row> = {}
  if (contractorIds.length) {
    const [{ data: custs }, { data: profs }] = await Promise.all([
      supabase
        .from('customers')
        .select('id, business_name, phone, website, logo_url')
        .in('id', contractorIds),
      supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', contractorIds),
    ])
    for (const c of custs || []) {
      businesses[c.id] = c.business_name || 'Your Contractor'
      contractors[c.id] = { ...(contractors[c.id] || {}), ...c }
    }
    for (const p of profs || []) {
      contractors[p.id] = { ...(contractors[p.id] || {}), full_name: p.full_name, email: p.email }
      if (!businesses[p.id]) businesses[p.id] = p.full_name || 'Your Contractor'
    }
  }

  const client = (clients || [])[0] || null
  const primaryContractorId =
    (links || [])[0]?.contractor_id ||
    contractorIds[0] ||
    null
  const primaryContractor = primaryContractorId ? contractors[primaryContractorId] : null

  return NextResponse.json({
    data: {
      linked: true,
      client,
      businesses,
      contractors,
      primary_contractor: primaryContractor,
      invoices: invoices || [],
      jobs: jobs || [],
      conversations: conversations || [],
      contracts: contracts || [],
      unread_message_count: unreadCount,
    },
  })
}
