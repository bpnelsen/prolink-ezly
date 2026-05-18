import { NextRequest, NextResponse } from 'next/server'
import { requireUser, badRequest, notFound, serverError } from '../../../../../../lib/server-auth'

/** GET /api/v1/conversations/:id/messages — poll: thread + plan + pending suggestions. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', params.id)
    .single()
  if (!conversation) return notFound('Conversation not found')

  const { data: dealPlan } = await supabase
    .from('deal_plans')
    .select('*')
    .eq('job_id', conversation.job_id)
    .maybeSingle()

  const [{ data: messages }, suggestionsRes] = await Promise.all([
    supabase
      .from('messages')
      .select('id, sender_role, sender_name, body, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true }),
    dealPlan
      ? supabase
          .from('deal_plan_suggestions')
          .select('*')
          .eq('deal_plan_id', dealPlan.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  return NextResponse.json({
    data: {
      conversation,
      deal_plan: dealPlan || null,
      messages: messages || [],
      suggestions: suggestionsRes.data || [],
    },
  })
}

/** POST /api/v1/conversations/:id/messages — contractor sends a message. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { user, supabase } = auth

  const body = await req.json().catch(() => null)
  const text = typeof body?.body === 'string' ? body.body.trim() : ''
  if (!text) return badRequest('Message body is required')
  if (text.length > 4000) return badRequest('Message is too long (max 4000 characters)')

  // RLS guarantees the caller can only see/insert into their own conversation.
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', params.id)
    .single()
  if (!conversation) return notFound('Conversation not found')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      sender_role: 'contractor',
      sender_name: profile?.full_name || 'Contractor',
      body: text,
    })
    .select('id, sender_role, sender_name, body, created_at')
    .single()
  if (error) return serverError('Failed to send message', error.message)

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversation.id)

  return NextResponse.json({ data: message }, { status: 201 })
}
