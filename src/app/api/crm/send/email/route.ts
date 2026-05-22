import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAdmin, badRequest, notFound, serverError } from '@/lib/server-auth'
import { buildVars, renderTemplate } from '@/lib/crm-templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Sender identity. Override per-environment by setting CRM_FROM_EMAIL; the
// domain must be verified in Resend before deliveries to anyone outside the
// account's test inbox will succeed.
const FROM = process.env.CRM_FROM_EMAIL || 'Brian Nelsen <Brian@useezly.com>'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function bodyToHtml(text: string): string {
  // Plain-text → simple HTML: escape, preserve newlines, auto-link URLs.
  const escaped = escapeHtml(text)
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#0F3A7D;">$1</a>',
  )
  return linked.replace(/\n/g, '<br/>')
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return serverError('Resend is not configured (missing RESEND_API_KEY).')
  }

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
  if (!contractor.email) return badRequest('Contractor has no email on file')

  // Either render a stored template, or use raw subject/body the user typed.
  let subject = (body?.subject || '').toString().trim()
  let messageBody = (body?.body || '').toString()

  if (body?.template_id) {
    const { data: tpl } = await supabase
      .from('crm_templates').select('*').eq('id', body.template_id).maybeSingle()
    if (!tpl || tpl.kind !== 'email') return badRequest('Template not found or not an email template')
    subject = tpl.subject || subject
    messageBody = tpl.body
  }

  if (!subject) return badRequest('subject is required')
  if (!messageBody) return badRequest('body is required')

  const vars = buildVars({
    contractor,
    sender_name: user.email?.split('@')[0],
    sender_email: user.email,
  })
  subject = renderTemplate(subject, vars)
  messageBody = renderTemplate(messageBody, vars)

  // Find or create the matching deal so the activity attaches to the pipeline.
  const { data: dealRow } = await supabase
    .from('crm_deals').select('id').eq('contractor_id', contractorId).maybeSingle()

  const resend = new Resend(apiKey)
  const { error: sendErr } = await resend.emails.send({
    from: FROM,
    to: contractor.email,
    replyTo: user.email || undefined,
    subject,
    html: bodyToHtml(messageBody),
    text: messageBody,
  })
  if (sendErr) {
    return serverError(sendErr.message || 'Email send failed', sendErr)
  }

  // Log as an activity + advance contact_status / contact_date.
  const { data: activity, error: aErr } = await supabase
    .from('crm_activities')
    .insert({
      contractor_id: contractorId,
      deal_id: dealRow?.id || null,
      kind: 'email',
      subject,
      body: messageBody,
      completed: true,
      completed_at: new Date().toISOString(),
      owner_email: user.email,
    })
    .select('*').single()
  if (aErr) return serverError(aErr.message)

  await supabase.from('imported_contractors').update({
    contact_status: 'contacted',
    contact_date: new Date().toISOString(),
  }).eq('id', contractorId)

  return NextResponse.json({ activity })
}
