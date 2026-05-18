import { NextRequest, NextResponse } from 'next/server'
import { requireClient, notFound } from '../../../../../../lib/server-auth'

/** GET /api/v1/portal/conversations/:id — thread for one of the caller's jobs. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireClient(req)
  if ('error' in auth) return auth.error
  const { supabase, clientIds } = auth

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, client_id, job_id, contractor_id, jobs(title)')
    .eq('id', params.id)
    .maybeSingle()
  if (!conv || !conv.client_id || !clientIds.includes(conv.client_id)) {
    return notFound('Conversation not found')
  }

  const [{ data: messages }, { data: biz }] = await Promise.all([
    supabase
      .from('messages')
      .select('id, sender_role, sender_name, body, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true }),
    supabase.from('customers').select('business_name, logo_url').eq('id', conv.contractor_id).maybeSingle(),
  ])

  return NextResponse.json({
    data: { conversation: conv, messages: messages || [], business: biz || {} },
  })
}
