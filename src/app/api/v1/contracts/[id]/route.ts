import { NextRequest, NextResponse } from 'next/server'
import { requireUser, badRequest, notFound, forbidden } from '../../../../../lib/server-auth'

const EDITABLE_FIELDS = [
  'contract_sum', 'deposit_pct', 'retainage_pct', 'application_due_day',
  'payment_due_days', 'late_interest_rate_annual', 'dispute_method',
  'governing_law_state', 'start_date', 'substantial_completion_date',
]

/** GET /api/v1/contracts/:id — with related rows */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const { data, error } = await supabase
    .from('contracts')
    .select('*, clients(*), jobs(*), contract_signatures(*), contract_versions(*), change_orders(*)')
    .eq('id', params.id)
    .single()
  if (error || !data) return notFound('Contract not found')
  return NextResponse.json({ data })
}

/** PUT /api/v1/contracts/:id — only while status='draft' */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const body = await req.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON body')

  const { data: existing } = await supabase
    .from('contracts').select('status').eq('id', params.id).single()
  if (!existing) return notFound('Contract not found')
  if (existing.status !== 'draft') return forbidden('Only draft contracts can be edited.')

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of EDITABLE_FIELDS) if (k in body) update[k] = body[k]

  const { data, error } = await supabase
    .from('contracts').update(update).eq('id', params.id).select('*').single()
  if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

/** DELETE /api/v1/contracts/:id — soft cancel; only while status='draft' */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const { data: existing } = await supabase
    .from('contracts').select('status').eq('id', params.id).single()
  if (!existing) return notFound('Contract not found')
  if (existing.status !== 'draft') return forbidden('Only draft contracts can be cancelled here.')

  const { data, error } = await supabase
    .from('contracts')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: 'cancel_failed', message: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
