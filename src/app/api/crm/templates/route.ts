import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, badRequest, serverError } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  const url = new URL(req.url)
  const kind = url.searchParams.get('kind')

  let query = supabase.from('crm_templates').select('*').order('name', { ascending: true })
  if (kind === 'email' || kind === 'dm') query = query.eq('kind', kind)

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

  const kind = body?.kind
  if (kind !== 'email' && kind !== 'dm') return badRequest('kind must be "email" or "dm"')
  if (!body?.name?.trim()) return badRequest('name is required')
  if (!body?.body?.trim()) return badRequest('body is required')
  if (kind === 'email' && !body?.subject?.trim()) {
    return badRequest('subject is required for email templates')
  }

  const { data, error } = await supabase
    .from('crm_templates')
    .insert({
      kind,
      name: body.name.trim(),
      subject: kind === 'email' ? body.subject.trim() : null,
      body: body.body,
      created_by_email: user.email,
    })
    .select('*').single()
  if (error) return serverError(error.message)
  return NextResponse.json({ template: data })
}
