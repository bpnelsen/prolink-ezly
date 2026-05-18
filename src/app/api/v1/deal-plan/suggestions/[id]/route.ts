import { NextRequest, NextResponse } from 'next/server'
import { requireUser, badRequest, notFound, serverError } from '../../../../../../lib/server-auth'

const SECTIONS = new Set([
  'scope', 'pricing', 'schedule', 'decisions', 'action_items',
  'change_order_opportunities', 'value_engineering', 'upgrade_opportunities',
])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

/**
 * PATCH /api/v1/deal-plan/suggestions/:id
 * Body: { action: 'accept' | 'reject', payload?: <edited item> }
 * Accept is the ONLY path that writes the deal plan, and only after the
 * contractor approves. RLS scopes the suggestion/plan to the caller.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const body = await req.json().catch(() => null)
  const action = body?.action
  if (action !== 'accept' && action !== 'reject') {
    return badRequest("action must be 'accept' or 'reject'")
  }

  const { data: suggestion } = await supabase
    .from('deal_plan_suggestions')
    .select('*')
    .eq('id', params.id)
    .single()
  if (!suggestion) return notFound('Suggestion not found')
  if (suggestion.status !== 'pending') {
    return badRequest('This suggestion has already been decided')
  }

  if (action === 'reject') {
    const { error } = await supabase
      .from('deal_plan_suggestions')
      .update({ status: 'rejected', decided_at: new Date().toISOString() })
      .eq('id', suggestion.id)
    if (error) return serverError('Failed to reject suggestion', error.message)
    return NextResponse.json({ data: { status: 'rejected' } })
  }

  // accept
  const section: string = suggestion.section
  if (!SECTIONS.has(section)) return badRequest('Unknown deal plan section')
  const item = body?.payload && typeof body.payload === 'object' ? body.payload : suggestion.payload

  const { data: plan } = await supabase
    .from('deal_plans')
    .select('*')
    .eq('id', suggestion.deal_plan_id)
    .single()
  if (!plan) return notFound('Deal plan not found')

  const current: Row[] = Array.isArray(plan[section]) ? plan[section] : []
  let next: Row[]
  if (suggestion.operation === 'remove') {
    const t = String((item as Row)?.title || '').toLowerCase()
    next = current.filter(x => String(x?.title || '').toLowerCase() !== t)
  } else {
    next = [...current, { ...item, _added_at: new Date().toISOString() }]
  }

  const { error: upErr } = await supabase
    .from('deal_plans')
    .update({ [section]: next, updated_at: new Date().toISOString() })
    .eq('id', plan.id)
  if (upErr) return serverError('Failed to update deal plan', upErr.message)

  const { error: sErr } = await supabase
    .from('deal_plan_suggestions')
    .update({ status: 'accepted', decided_at: new Date().toISOString() })
    .eq('id', suggestion.id)
  if (sErr) return serverError('Failed to mark suggestion accepted', sErr.message)

  return NextResponse.json({ data: { status: 'accepted', section, deal_plan: { ...plan, [section]: next } } })
}
