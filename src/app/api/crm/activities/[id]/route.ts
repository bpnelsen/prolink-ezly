import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, badRequest, serverError } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const allowed = ['subject', 'body', 'completed', 'due_at', 'owner_email']
  const patch: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) patch[k] = body[k]

  if ('completed' in patch) {
    patch.completed_at = patch.completed ? new Date().toISOString() : null
  }

  if (Object.keys(patch).length === 0) return badRequest('No updatable fields supplied')

  const { data, error } = await supabase
    .from('crm_activities').update(patch).eq('id', params.id).select('*').single()
  if (error) return serverError(error.message)
  return NextResponse.json({ activity: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  const { error } = await supabase.from('crm_activities').delete().eq('id', params.id)
  if (error) return serverError(error.message)
  return NextResponse.json({ ok: true })
}
