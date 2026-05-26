import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { sendSmsNotification } from '@/lib/twilio-service'

export const runtime = 'nodejs'

const ADMIN_EMAIL = process.env.CRM_FROM_EMAIL || 'Brian@useezly.com'
const ADMIN_PHONE = process.env.NOTIFY_PHONE_NUMBER || ''
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET || ''

export async function POST(req: NextRequest) {
  // Verify the shared secret Supabase sends in a custom header
  const incomingSecret = req.headers.get('x-webhook-secret') || ''
  if (!WEBHOOK_SECRET || incomingSecret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // Supabase DB webhooks send type=INSERT/UPDATE/DELETE
  if (payload?.type !== 'INSERT' || payload?.table !== 'profiles') {
    return NextResponse.json({ received: true, skipped: true })
  }

  const record = payload.record || {}
  const name: string = record.full_name || record.email || 'Unknown'
  const email: string = record.email || '(no email)'
  const role: string = record.role || 'unknown'
  const createdAt: string = record.created_at
    ? new Date(record.created_at).toLocaleString('en-US', { timeZone: 'America/Denver' })
    : new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })

  const subject = `New UseEzly signup: ${name}`
  const body = `A new profile was just created on UseEzly.\n\nName: ${name}\nEmail: ${email}\nRole: ${role}\nTime: ${createdAt} MT`
  const htmlBody = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#0F3A7D;margin-bottom:4px;">New UseEzly Signup</h2>
      <table style="border-collapse:collapse;width:100%;margin-top:12px;">
        <tr><td style="padding:6px 0;color:#555;width:80px;">Name</td><td style="padding:6px 0;font-weight:600;">${name}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Email</td><td style="padding:6px 0;">${email}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Role</td><td style="padding:6px 0;">${role}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Time</td><td style="padding:6px 0;">${createdAt} MT</td></tr>
      </table>
      <p style="margin-top:20px;"><a href="https://app.useezly.com/dashboard/admin" style="color:#0F3A7D;">View admin dashboard →</a></p>
    </div>`

  const results = await Promise.allSettled([
    sendEmailAlert(subject, htmlBody, body),
    ADMIN_PHONE ? sendSmsNotification(ADMIN_PHONE, `UseEzly: New signup — ${name} (${email}) [${role}]`) : Promise.resolve({ skipped: true }),
  ])

  const [emailResult, smsResult] = results
  return NextResponse.json({
    received: true,
    email: emailResult.status === 'fulfilled' ? emailResult.value : { error: String((emailResult as PromiseRejectedResult).reason) },
    sms: smsResult.status === 'fulfilled' ? smsResult.value : { error: String((smsResult as PromiseRejectedResult).reason) },
  })
}

async function sendEmailAlert(subject: string, html: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { skipped: true, reason: 'RESEND_API_KEY not set' }
  const resend = new Resend(apiKey)
  const from = process.env.CRM_FROM_EMAIL || 'Brian@useezly.com'
  const { error } = await resend.emails.send({ from, to: ADMIN_EMAIL, subject, html, text })
  if (error) throw new Error(error.message)
  return { success: true }
}
