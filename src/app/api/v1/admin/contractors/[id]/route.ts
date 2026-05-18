import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, badRequest, notFound, serverError } from '../../../../../../lib/server-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

async function safeSelect(
  svc: SupabaseClient,
  table: string,
  cols: string,
  contractorId: string,
  order?: string
): Promise<Row[]> {
  try {
    let q = svc.from(table).select(cols).eq('contractor_id', contractorId)
    if (order) q = q.order(order, { ascending: false })
    const { data, error } = await q
    if (error) return []
    return (data as Row[]) || []
  } catch {
    return []
  }
}

/** GET /api/v1/admin/contractors/:id — one contractor + all their data. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error
  const svc = auth.supabase
  const id = params.id

  const { data: prof } = await svc
    .from('profiles')
    .select('id, full_name, email, phone, created_at')
    .eq('id', id)
    .single()
  if (!prof) return notFound('Contractor not found')

  const { data: cust } = await svc
    .from('customers')
    .select('business_name')
    .eq('id', id)
    .single()

  const [clients, jobs, invoices, technicians] = await Promise.all([
    safeSelect(svc, 'clients', '*', id, 'created_at'),
    safeSelect(svc, 'jobs', 'id, title, status, stage, estimated_value, scheduled_start', id, 'created_at'),
    safeSelect(svc, 'invoices', 'id, invoice_number, status, total, amount_paid, balance_due, issue_date', id, 'created_at'),
    safeSelect(svc, 'technicians', 'id, name, is_active', id),
  ])

  let website: Row | null = null
  try {
    const { data } = await svc
      .from('contractor_websites')
      .select('id, slug, published, business_name')
      .eq('contractor_id', id)
      .maybeSingle()
    website = data || null
  } catch {
    website = null
  }

  const profile = { ...prof, business_name: cust?.business_name ?? null }
  return NextResponse.json({ data: { profile, clients, jobs, invoices, technicians, website } })
}

/** PATCH /api/v1/admin/contractors/:id — edit identity fields. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error
  const svc = auth.supabase
  const id = params.id

  const body = await req.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON body')

  const norm = (v: unknown) => {
    const s = typeof v === 'string' ? v.trim() : ''
    return s.length ? s : null
  }

  const { error: pErr } = await svc
    .from('profiles')
    .update({
      full_name: norm(body.full_name),
      email: norm(body.email),
      phone: norm(body.phone),
    })
    .eq('id', id)
  if (pErr) return serverError('Failed to update profile', pErr.message)

  if ('business_name' in body) {
    await svc.from('customers').update({ business_name: norm(body.business_name) }).eq('id', id)
  }

  const { data: prof } = await svc
    .from('profiles')
    .select('id, full_name, email, phone, created_at')
    .eq('id', id)
    .single()
  const { data: cust } = await svc.from('customers').select('business_name').eq('id', id).single()

  return NextResponse.json({ data: { profile: { ...prof, business_name: cust?.business_name ?? null } } })
}

/** DELETE /api/v1/admin/contractors/:id — remove the contractor and all data. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error
  const svc = auth.supabase
  const id = params.id

  // Best-effort child cleanup before the profile row (FKs may or may not
  // cascade depending on how the project was provisioned).
  for (const table of ['invoices', 'jobs', 'clients', 'technicians', 'contractor_websites']) {
    try {
      await svc.from(table).delete().eq('contractor_id', id)
    } catch {
      /* table may not exist or use a different owner column */
    }
  }
  // customers is keyed by id (= profiles.id), not contractor_id
  try {
    await svc.from('customers').delete().eq('id', id)
  } catch {
    /* ignore */
  }

  const { error } = await svc.from('profiles').delete().eq('id', id)
  if (error) return serverError('Failed to delete contractor', error.message)
  return NextResponse.json({ data: { deleted: true } })
}
