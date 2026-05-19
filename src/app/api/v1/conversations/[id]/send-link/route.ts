import { NextRequest, NextResponse } from 'next/server'
import { requireUser, badRequest, notFound, serverError } from '../../../../../../lib/server-auth'

export const runtime = 'nodejs'

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (trimmed.startsWith('+')) {
    const d = trimmed.slice(1).replace(/\D/g, '')
    return d.length >= 10 ? `+${d}` : null
  }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

function mask(s: string): string {
  if (s.includes('@')) {
    const [u, d] = s.split('@')
    return `${u.slice(0, 2)}•••@${d}`
  }
  return `${s.slice(0, 2)}•••${s.slice(-4)}`
}

/**
 * POST /api/v1/conversations/:id/send-link  Body: { kind: 'chat' | 'portal' }
 * Sends the customer their chat link or a portal invite. Auto-channel:
 * SMS via Twilio if the client has a usable phone, else email via Resend.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { user, supabase } = auth

  const body = await req.json().catch(() => ({}))
  const kind = body?.kind === 'portal' ? 'portal' : 'chat'

  // RLS scopes the conversation to the calling contractor.
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, public_token, client_id, contractor_id, jobs(title)')
    .eq('id', params.id)
    .maybeSingle()
  if (!conv) return notFound('Conversation not found')
  if (!conv.client_id) return badRequest('This job has no customer attached to send to.')

  const { data: client } = await supabase
    .from('clients')
    .select('first_name, last_name, email, phone')
    .eq('id', conv.client_id)
    .maybeSingle()
  if (!client) return badRequest('Customer record not found.')

  const { data: biz } = await supabase
    .from('customers')
    .select('business_name')
    .eq('id', conv.contractor_id)
    .maybeSingle()
  const businessName = biz?.business_name || 'Your contractor'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jobTitle = (conv as any).jobs?.title || 'your project'
  const base = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin

  let url: string
  if (kind === 'portal') {
    const { data: invite, error: invErr } = await supabase
      .from('client_portal_invites')
      .insert({ contractor_id: user.id, client_id: conv.client_id, email: client.email })
      .select('token')
      .single()
    if (invErr) return serverError('Could not create portal invite', invErr.message)
    url = `${base}/portal/claim/${invite.token}`
  } else {
    url = `${base}/chat/${conv.public_token}`
  }

  const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'there'
  const text =
    kind === 'portal'
      ? `Hi ${name}, ${businessName} invited you to your customer portal — view invoices, messages & contracts in one place: ${url}`
      : `Hi ${name}, ${businessName} sent you a message about "${jobTitle}". Reply here: ${url}`

  const phone = normalizePhone(client.phone)
  const twilioReady =
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER

  // 1) SMS if the client has a usable phone and Twilio is configured.
  if (phone && twilioReady) {
    try {
      const { Twilio } = await import('twilio')
      const tw = new Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
      await tw.messages.create({ body: text, from: process.env.TWILIO_PHONE_NUMBER!, to: phone })
      return NextResponse.json({ data: { sent: true, channel: 'sms', to: mask(phone) } })
    } catch (err) {
      // fall through to email
      console.error('send-link sms failed:', err)
    }
  }

  // 2) Email fallback.
  if (client.email && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const from = process.env.CONTACT_FROM_EMAIL || 'Prolink <onboarding@resend.dev>'
      const { error: mailErr } = await resend.emails.send({
        from,
        to: client.email,
        subject: kind === 'portal' ? 'Your customer portal access' : `Message from ${businessName}`,
        text,
      })
      if (mailErr) return serverError('Email failed', mailErr.message)
      return NextResponse.json({ data: { sent: true, channel: 'email', to: mask(client.email) } })
    } catch (err) {
      return serverError('Email failed', err instanceof Error ? err.message : String(err))
    }
  }

  // Nothing we could use.
  const why = !phone && !client.email
    ? 'this customer has no phone or email on file'
    : phone && !twilioReady && !client.email
      ? 'SMS is not configured and the customer has no email'
      : !client.email
        ? 'SMS could not be sent and the customer has no email'
        : 'email is not configured (set RESEND_API_KEY)'
  return NextResponse.json(
    { data: { sent: false, url }, error: 'not_sent', message: `Couldn’t send automatically — ${why}. The link is copied below.` },
    { status: 200 }
  )
}
