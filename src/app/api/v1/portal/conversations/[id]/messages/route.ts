import { NextRequest, NextResponse } from 'next/server'
import { requireClient, badRequest, notFound, serverError } from '../../../../../../../lib/server-auth'

/** POST /api/v1/portal/conversations/:id/messages — customer replies. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireClient(req)
  if ('error' in auth) return auth.error
  const { supabase, clientIds } = auth

  const body = await req.json().catch(() => null)
  const text = typeof body?.body === 'string' ? body.body.trim() : ''
  if (!text) return badRequest('Message body is required')
  if (text.length > 4000) return badRequest('Message is too long (max 4000 characters)')

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, client_id, status')
    .eq('id', params.id)
    .maybeSingle()
  if (!conv || !conv.client_id || !clientIds.includes(conv.client_id)) {
    return notFound('Conversation not found')
  }
  if (conv.status !== 'active') return badRequest('This conversation is closed.')

  const { data: client } = await supabase
    .from('clients')
    .select('first_name, last_name')
    .eq('id', conv.client_id)
    .maybeSingle()
  const name = [client?.first_name, client?.last_name].filter(Boolean).join(' ').trim() || 'Customer'

  const { data: message, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conv.id, sender_role: 'client', sender_name: name, body: text })
    .select('id, sender_role, sender_name, body, created_at')
    .single()
  if (error) return serverError('Failed to send message', error.message)

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conv.id)

  return NextResponse.json({ data: message }, { status: 201 })
}
