import { NextRequest, NextResponse } from 'next/server'
import { requireUser, badRequest, notFound, serverError } from '../../../../lib/server-auth'

export const runtime = 'nodejs'

const ALLOWED_STATUS = ['new', 'contacted', 'quoted', 'won', 'lost', 'spam'] as const

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error

  let body: { status?: string; notes?: string }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON')
  }

  const patch: Record<string, unknown> = {}
  if (typeof body.status === 'string') {
    if (!ALLOWED_STATUS.includes(body.status as typeof ALLOWED_STATUS[number])) {
      return badRequest('Invalid status')
    }
    patch.status = body.status
  }
  if (typeof body.notes === 'string') {
    patch.notes = body.notes.slice(0, 5000)
  }

  if (Object.keys(patch).length === 0) return badRequest('Nothing to update')

  const { data, error } = await auth.supabase
    .from('website_leads')
    .update(patch)
    .eq('id', params.id)
    .eq('contractor_id', auth.user.id)
    .select()
    .single()

  if (error) return serverError('Failed to update lead', error.message)
  if (!data) return notFound('Lead not found')
  return NextResponse.json({ lead: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error

  const { error } = await auth.supabase
    .from('website_leads')
    .delete()
    .eq('id', params.id)
    .eq('contractor_id', auth.user.id)

  if (error) return serverError('Failed to delete lead', error.message)
  return NextResponse.json({ ok: true })
}
