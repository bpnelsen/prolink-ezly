import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, badRequest, serverError } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const allowed = ['name', 'subject', 'body']
  const patch: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) patch[k] = body[k]
  if (Object.keys(patch).length === 0) return badRequest('No updatable fields supplied')

  const { data, error } = await supabase
    .from('crm_templates').update(patch).eq('id', params.id)
    .select('*').single()
  if (error) return serverError(error.message)
  return NextResponse.json({ template: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  const { error } = await supabase.from('crm_templates').delete().eq('id', params.id)
  if (error) return serverError(error.message)
  return NextResponse.json({ ok: true })
}
