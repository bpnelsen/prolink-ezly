import { NextRequest, NextResponse } from 'next/server'
import { requireUser, notFound, serverError } from '../../../../../../lib/server-auth'

/**
 * GET /api/v1/jobs/:jobId/conversation
 * Resolves (creating if needed) the single conversation + deal plan for a
 * job the caller owns, and returns the thread, plan, and pending AI
 * suggestions. RLS scopes every read/write to the authenticated contractor.
 */
export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { user, supabase } = auth
  const jobId = params.jobId

  // Job must exist and belong to the caller (jobs RLS enforces ownership).
  const { data: job } = await supabase
    .from('jobs')
    .select('id, title, client_id')
    .eq('id', jobId)
    .single()
  if (!job) return notFound('Job not found')

  let { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle()

  if (!conversation) {
    const { data: created, error: cErr } = await supabase
      .from('conversations')
      .insert({ contractor_id: user.id, client_id: job.client_id ?? null, job_id: jobId })
      .select('*')
      .single()
    if (cErr) return serverError('Could not start conversation', cErr.message)
    conversation = created
  }

  let { data: dealPlan } = await supabase
    .from('deal_plans')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle()

  if (!dealPlan) {
    const { data: created, error: dErr } = await supabase
      .from('deal_plans')
      .insert({ job_id: jobId, contractor_id: user.id })
      .select('*')
      .single()
    if (dErr) return serverError('Could not create deal plan', dErr.message)
    dealPlan = created
  }

  const [{ data: messages }, { data: suggestions }] = await Promise.all([
    supabase
      .from('messages')
      .select('id, sender_role, sender_name, body, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('deal_plan_suggestions')
      .select('*')
      .eq('deal_plan_id', dealPlan.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    data: {
      job: { id: job.id, title: job.title },
      conversation,
      deal_plan: dealPlan,
      messages: messages || [],
      suggestions: suggestions || [],
    },
  })
}
