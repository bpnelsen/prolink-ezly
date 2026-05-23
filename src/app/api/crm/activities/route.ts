import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, badRequest, serverError } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

const KINDS = ['note', 'call', 'email', 'sms', 'task', 'meeting']

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  const url = new URL(req.url)
  const contractor_id = url.searchParams.get('contractor_id') || ''
  const openOnly = url.searchParams.get('open_only') === '1'
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 500)

  let query = supabase.from('crm_activities').select('*')
  if (contractor_id) query = query.eq('contractor_id', contractor_id)
  if (openOnly) query = query.eq('completed', false).in('kind', ['task', 'call', 'meeting'])

  query = query.order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false }).limit(limit)

  const { data, error } = await query
  if (error) return serverError(error.message)
  return NextResponse.json({ items: data || [] })
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase, user } = gate

  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  if (!body?.contractor_id) return badRequest('contractor_id is required')
  if (!KINDS.includes(body?.kind)) return badRequest(`kind must be one of ${KINDS.join(', ')}`)

  // Try to attach the activity to the contractor's deal, if one exists.
  const { data: dealRow } = await supabase
    .from('crm_deals').select('id').eq('contractor_id', body.contractor_id).maybeSingle()

  const payload: Record<string, unknown> = {
    contractor_id: body.contractor_id,
    deal_id: dealRow?.id || null,
    kind: body.kind,
    subject: body.subject || null,
    body: body.body || null,
    due_at: body.due_at || null,
    completed: body.kind === 'note' || body.kind === 'call' || body.kind === 'email' || body.kind === 'sms',
    completed_at: (body.kind === 'note' || body.kind === 'call' || body.kind === 'email' || body.kind === 'sms')
      ? new Date().toISOString() : null,
    owner_email: user.email,
  }

  const { data, error } = await supabase
    .from('crm_activities').insert(payload).select('*').single()
  if (error) return serverError(error.message)

  // Sync contact_status / contact_date on the parent when an outbound touch
  // happens. Always bump contact_date; only promote contact_status when it's
  // still at an initial value, so we don't trample qualified/do-not-contact.
  if (payload.kind === 'call' || payload.kind === 'email' || payload.kind === 'sms') {
    const { data: current } = await supabase
      .from('imported_contractors').select('contact_status').eq('id', body.contractor_id).maybeSingle()
    const update: Record<string, unknown> = { contact_date: new Date().toISOString() }
    if (!current?.contact_status || current.contact_status === 'new') {
      update.contact_status = 'contacted'
    }
    await supabase.from('imported_contractors').update(update).eq('id', body.contractor_id)
  }

  return NextResponse.json({ activity: data })
}
