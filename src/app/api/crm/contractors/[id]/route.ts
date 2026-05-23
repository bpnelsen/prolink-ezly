import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, badRequest, notFound, serverError } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  const { data: contractor, error: cErr } = await supabase
    .from('imported_contractors').select('*').eq('id', params.id).maybeSingle()
  if (cErr) return serverError(cErr.message)
  if (!contractor) return notFound('Contractor not found')

  const { data: deal } = await supabase
    .from('crm_deals').select('*').eq('contractor_id', params.id).maybeSingle()

  const { data: activities, error: aErr } = await supabase
    .from('crm_activities').select('*').eq('contractor_id', params.id)
    .order('created_at', { ascending: false }).limit(200)
  if (aErr) return serverError(aErr.message)

  return NextResponse.json({ contractor, deal: deal || null, activities: activities || [] })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const allowed = [
    'business_name', 'phone', 'email', 'address', 'city', 'state', 'zip',
    'website', 'license_number', 'license_status', 'specialties', 'source',
    'contact_status', 'contact_date', 'notes', 'metadata',
  ]
  const patch: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) patch[k] = body[k]

  if (Object.keys(patch).length === 0) return badRequest('No updatable fields supplied')

  const { data, error } = await supabase
    .from('imported_contractors').update(patch).eq('id', params.id)
    .select('*').single()
  if (error) return serverError(error.message)

  return NextResponse.json({ contractor: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  const { error } = await supabase.from('imported_contractors').delete().eq('id', params.id)
  if (error) return serverError(error.message)
  return NextResponse.json({ ok: true })
}
