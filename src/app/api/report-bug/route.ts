import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const TO = process.env.BUG_REPORT_TO_EMAIL || 'info@useezly.com'
const FROM = process.env.CONTACT_FROM_EMAIL || 'EZLY Bug Reports <onboarding@resend.dev>'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'Email is not configured. Please email info@useezly.com directly.' },
      { status: 500 }
    )
  }

  let body: {
    email?: string
    description?: string
    page_url?: string
    user_agent?: string
    website?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  // Honeypot — bots fill the hidden "website" field; real users don't.
  if (body.website && body.website.trim().length > 0) {
    return NextResponse.json({ ok: true })
  }

  const email = (body.email || '').trim().slice(0, 320)
  const description = (body.description || '').trim().slice(0, 5000)
  const pageUrl = (body.page_url || '').trim().slice(0, 500)
  const userAgent = (body.user_agent || '').trim().slice(0, 500)

  if (!description) {
    return NextResponse.json({ ok: false, error: 'Please describe what happened.' }, { status: 400 })
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'Invalid email address.' }, { status: 400 })
  }

  const resend = new Resend(apiKey)
  const subjectPreview = description.replace(/\s+/g, ' ').slice(0, 80)
  const subject = `[Bug Report] ${subjectPreview}${description.length > 80 ? '…' : ''}`

  const html = `
    <h2>New bug report</h2>
    <p><strong>From:</strong> ${escapeHtml(email) || '<em>anonymous</em>'}</p>
    <p><strong>Page:</strong> ${escapeHtml(pageUrl) || '<em>unknown</em>'}</p>
    <p><strong>User agent:</strong> ${escapeHtml(userAgent) || '<em>unknown</em>'}</p>
    <p><strong>Description:</strong></p>
    <pre style="font-family: inherit; white-space: pre-wrap; background:#f7f7f7; padding:12px; border-radius:8px;">${escapeHtml(description)}</pre>
  `
  const text = [
    `From: ${email || '(anonymous)'}`,
    `Page: ${pageUrl || '(unknown)'}`,
    `User agent: ${userAgent || '(unknown)'}`,
    '',
    description,
  ].join('\n')

  const { error } = await resend.emails.send({
    from: FROM,
    to: TO,
    replyTo: email || undefined,
    subject,
    html,
    text,
  })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message || 'send_failed' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
