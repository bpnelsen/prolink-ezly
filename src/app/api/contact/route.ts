import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const TO = process.env.CONTACT_TO_EMAIL || 'ezly.home@gmail.com'
const FROM = process.env.CONTACT_FROM_EMAIL || 'EZLY Contact <onboarding@resend.dev>'

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
    return NextResponse.json({ ok: false, error: 'email_not_configured' }, { status: 500 })
  }

  let body: { name?: string; email?: string; message?: string; website?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  // Honeypot: bots fill hidden "website" field; humans don't.
  if (body.website && body.website.trim().length > 0) {
    return NextResponse.json({ ok: true })
  }

  const name = (body.name || '').trim().slice(0, 200)
  const email = (body.email || '').trim().slice(0, 320)
  const message = (body.message || '').trim().slice(0, 5000)

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
  }
  if (!message) {
    return NextResponse.json({ ok: false, error: 'missing_message' }, { status: 400 })
  }

  const resend = new Resend(apiKey)
  const subject = name ? `New contact from ${name}` : 'New contact form submission'
  const html = `
    <h2>New contact form submission</h2>
    <p><strong>Name:</strong> ${escapeHtml(name) || '<em>not provided</em>'}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Message:</strong></p>
    <pre style="font-family: inherit; white-space: pre-wrap;">${escapeHtml(message)}</pre>
  `

  const { error } = await resend.emails.send({
    from: FROM,
    to: TO,
    replyTo: email,
    subject,
    html,
    text: `Name: ${name || '(not provided)'}\nEmail: ${email}\n\n${message}`,
  })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message || 'send_failed' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
