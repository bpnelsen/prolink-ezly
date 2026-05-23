import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, badRequest, notFound, serverError } from '@/lib/server-auth'
import { buildVars, renderTemplate } from '@/lib/crm-templates'

export const dynamic = 'force-dynamic'

// LinkedIn (and other social DMs) have no first-party send API. This route
// just renders the template against the contractor, returns the final text
// for the client to copy-to-clipboard, and logs an activity so the touch
// shows up on the pipeline. No outbound network call.
export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase, user } = gate

  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const contractorId: string | undefined = body?.contractor_id
  if (!contractorId) return badRequest('contractor_id is required')

  const { data: contractor, error: cErr } = await supabase
    .from('imported_contractors').select('*').eq('id', contractorId).maybeSingle()
  if (cErr) return serverError(cErr.message)
  if (!contractor) return notFound('Contractor not found')
  if (contractor.contact_status === 'do_not_contact') {
    return badRequest('This contractor is marked DO NOT CONTACT. Remove the flag on their profile before sending.')
  }

  let messageBody = (body?.body || '').toString()
  if (body?.template_id) {
    const { data: tpl } = await supabase
      .from('crm_templates').select('*').eq('id', body.template_id).maybeSingle()
    if (!tpl || tpl.kind !== 'dm') return badRequest('Template not found or not a dm template')
    messageBody = tpl.body
  }
  if (!messageBody) return badRequest('body is required')

  // Same lookup order as the email route: env → profile → email prefix.
  let senderName = process.env.CRM_SENDER_NAME || ''
  if (!senderName) {
    const { data: prof } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    senderName = prof?.full_name || user.email?.split('@')[0] || ''
  }

  const vars = buildVars({
    contractor,
    sender_name: senderName,
    sender_email: user.email,
  })
  const rendered = renderTemplate(messageBody, vars)

  // Log as a "dm" activity. Marked completed since the act of generating the
  // copy-to-paste text counts as the touch (manual paste happens in LinkedIn).
  const { data: dealRow } = await supabase
    .from('crm_deals').select('id').eq('contractor_id', contractorId).maybeSingle()

  const { data: activity, error: aErr } = await supabase
    .from('crm_activities')
    .insert({
      contractor_id: contractorId,
      deal_id: dealRow?.id || null,
      kind: 'dm',
      subject: body?.subject || 'LinkedIn DM',
      body: rendered,
      completed: true,
      completed_at: new Date().toISOString(),
      owner_email: user.email,
    })
    .select('*').single()
  if (aErr) return serverError(aErr.message)

  // Always bump contact_date; only promote contact_status when it's still
  // at an initial value, so we don't trample qualified/unqualified/do-not-contact.
  const update: Record<string, unknown> = { contact_date: new Date().toISOString() }
  if (!contractor.contact_status || contractor.contact_status === 'new') {
    update.contact_status = 'contacted'
  }
  await supabase.from('imported_contractors').update(update).eq('id', contractorId)

  return NextResponse.json({ activity, rendered })
}
