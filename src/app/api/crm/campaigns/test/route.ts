import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAdmin, badRequest, serverError } from '@/lib/server-auth'
import { physicalAddress, renderForRecipient } from '@/lib/crm-campaign-render'
import type { ImportedContractor } from '@/lib/crm-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const FROM = process.env.CRM_FROM_EMAIL || 'Brian Nelsen <Brian@useezly.com>'
const REPLY_TO = process.env.CRM_REPLY_TO || ''

// Sends one rendered email to the calling admin's own address so they can
// see exactly what a real recipient will receive — variables, footer, and
// unsubscribe link included. The recipient is a synthetic contractor with
// realistic-looking placeholder values for {{business_name}}, {{city}}, etc.
export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return serverError('Resend is not configured (missing RESEND_API_KEY).')
  if (!physicalAddress()) {
    return badRequest('CRM_PHYSICAL_ADDRESS must be set before sending campaigns.')
  }

  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase, user } = gate
  if (!user.email) return badRequest('Your account has no email address to test-send to.')

  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const subject = (body?.subject || '').toString().trim()
  const messageBody = (body?.body || '').toString()
  if (!subject) return badRequest('subject is required')
  if (!messageBody) return badRequest('body is required')

  let senderName = process.env.CRM_SENDER_NAME || ''
  if (!senderName) {
    const { data: prof } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    senderName = prof?.full_name || user.email?.split('@')[0] || ''
  }

  // Synthetic contractor for variable substitution preview.
  const fakeContractor: ImportedContractor = {
    id: '00000000-0000-0000-0000-000000000000',
    business_name: 'Sample Contracting LLC',
    phone: '+18015550100',
    email: user.email,
    address: '123 Main St',
    city: 'Salt Lake City',
    state: 'UT',
    zip: '84101',
    website: 'https://example.com',
    license_number: 'B100-0000',
    license_status: 'active',
    specialties: ['General'],
    source: 'preview',
    contact_status: 'new',
    contact_date: null,
    notes: null,
    metadata: null,
    scraped_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Synthetic unsubscribe token — won't actually flip anyone if clicked
  // (no campaign recipient row exists for it).
  const fakeToken = '00000000-0000-0000-0000-000000000000'
  const rendered = renderForRecipient({
    contractor: fakeContractor,
    subject, body: messageBody,
    senderName, senderEmail: user.email,
    unsubscribeToken: fakeToken,
  })

  const resend = new Resend(apiKey)
  const { error: sendErr } = await resend.emails.send({
    from: FROM,
    to: user.email,
    ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
    subject: `[TEST] ${rendered.subject}`,
    html: rendered.bodyHtml,
    text: rendered.bodyText,
  })
  if (sendErr) return serverError(sendErr.message || 'Test send failed')

  return NextResponse.json({ ok: true, sent_to: user.email })
}
