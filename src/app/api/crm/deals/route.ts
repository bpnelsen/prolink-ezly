import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, badRequest, serverError } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  const { data, error } = await supabase
    .from('crm_deals').select('*').order('updated_at', { ascending: false })
  if (error) return serverError(error.message)
  return NextResponse.json({ items: data || [] })
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase, user } = gate

  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const contractor_id = body?.contractor_id
  if (!contractor_id) return badRequest('contractor_id is required')

  const allowed = ['stage_key', 'owner_email', 'value_cents', 'probability',
    'expected_close_date', 'lost_reason']
  const patch: Record<string, unknown> = { contractor_id }
  for (const k of allowed) if (k in body) patch[k] = body[k]
  if (!patch.owner_email) patch.owner_email = user.email

  const { data, error } = await supabase
    .from('crm_deals')
    .upsert(patch, { onConflict: 'contractor_id' })
    .select('*').single()
  if (error) return serverError(error.message)

  return NextResponse.json({ deal: data })
}
