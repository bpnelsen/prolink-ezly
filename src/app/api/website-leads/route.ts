import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireUser, serviceClient, badRequest, serverError } from '../../../lib/server-auth'

export const runtime = 'nodejs'

const FROM = process.env.CONTACT_FROM_EMAIL || 'EZLY Leads <onboarding@resend.dev>'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function clean(s: unknown, max = 500): string {
  if (typeof s !== 'string') return ''
  return s.trim().slice(0, max)
}

/**
 * Public lead submission from a contractor's website (/sites/[slug]).
 * Validates the slug → published site, inserts a row in website_leads
 * (RLS enforces the slug/contractor pairing), then emails the contractor.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON')
  }

  // Honeypot — bots fill the hidden "website" field; real users don't.
  if (typeof body.website === 'string' && body.website.trim().length > 0) {
    return NextResponse.json({ ok: true })
  }

  const slug = clean(body.slug, 200)
  const name = clean(body.name, 200)
  const email = clean(body.email, 320)
  const phone = clean(body.phone, 50)
  const message = clean(body.message, 5000)
  const service_interest = clean(body.service_interest, 200)
  const preferred_contact = clean(body.preferred_contact, 20)
  const preferred_time = clean(body.preferred_time, 200)
  const budget_range = clean(body.budget_range, 100)
  const project_address = clean(body.project_address, 300)
  const project_city = clean(body.project_city, 100)
  const project_zip = clean(body.project_zip, 20)

  if (!slug) return badRequest('Missing site identifier.')
  if (!name) return badRequest('Please enter your name.')
  if (!email && !phone) return badRequest('Please provide an email or phone number.')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest('Invalid email address.')
  }

  const allowedContact = ['email', 'phone', 'text', '']
  if (!allowedContact.includes(preferred_contact)) {
    return badRequest('Invalid preferred contact method.')
  }

  const svc = serviceClient()

  // Look up the site (service role bypasses RLS, but we still gate on published).
  const { data: site, error: siteErr } = await svc
    .from('contractor_websites')
    .select('id, contractor_id, business_name, lead_notify_email, email, published')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (siteErr) return serverError('Failed to look up site', siteErr.message)
  if (!site) return badRequest('This website is no longer accepting messages.')

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim().slice(0, 64) || null
  const ua = (req.headers.get('user-agent') || '').slice(0, 500) || null
  const referrer = (req.headers.get('referer') || '').slice(0, 500) || null

  const insertPayload = {
    contractor_id: site.contractor_id,
    website_id: site.id,
    slug,
    name,
    email: email || null,
    phone: phone || null,
    message: message || null,
    service_interest: service_interest || null,
    preferred_contact: preferred_contact || null,
    preferred_time: preferred_time || null,
    budget_range: budget_range || null,
    project_address: project_address || null,
    project_city: project_city || null,
    project_zip: project_zip || null,
    ip_address: ip,
    user_agent: ua,
    referrer,
    source: 'website',
    status: 'new',
  }

  const { data: lead, error: insertErr } = await svc
    .from('website_leads')
    .insert(insertPayload)
    .select('id, created_at')
    .single()

  if (insertErr) return serverError('Could not save your message', insertErr.message)

  // Best-effort email notification — never block lead capture on this.
  const notifyTo = site.lead_notify_email || site.email
  const apiKey = process.env.RESEND_API_KEY
  if (notifyTo && apiKey) {
    try {
      const resend = new Resend(apiKey)
      const subject = `New lead for ${site.business_name || 'your site'} — ${name}`
      const rows: [string, string][] = [
        ['Name', name],
        ['Email', email || '—'],
        ['Phone', phone || '—'],
        ['Service', service_interest || '—'],
        ['Best time to contact', preferred_time || '—'],
        ['Preferred contact', preferred_contact || '—'],
        ['Budget', budget_range || '—'],
        ['Project location', [project_address, project_city, project_zip].filter(Boolean).join(', ') || '—'],
      ]
      const tableHtml = rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px">${escapeHtml(k)}</td>` +
            `<td style="padding:6px 0;font-size:14px;color:#0f172a"><strong>${escapeHtml(v)}</strong></td></tr>`,
        )
        .join('')

      const html = `
        <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
          <h2 style="margin:0 0 12px 0;font-size:20px">New website lead</h2>
          <p style="color:#64748b;margin:0 0 20px 0;font-size:14px">A visitor just submitted the contact form on your site.</p>
          <table style="border-collapse:collapse;width:100%;margin-bottom:20px">${tableHtml}</table>
          ${message ? `<div style="background:#f8fafc;border-radius:8px;padding:14px 16px;font-size:14px;line-height:1.5;white-space:pre-wrap">${escapeHtml(message)}</div>` : ''}
          <p style="margin-top:24px;font-size:12px;color:#94a3b8">Manage your leads in the EZLY dashboard.</p>
        </div>
      `

      await resend.emails.send({
        from: FROM,
        to: notifyTo,
        subject,
        html,
        replyTo: email || undefined,
      })
    } catch {
      // swallow — lead is already saved
    }
  }

  return NextResponse.json({ ok: true, id: lead?.id })
}

/**
 * List the authenticated contractor's leads.
 * Query params: status (optional), limit (default 100).
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const limit = Math.min(Number(url.searchParams.get('limit') || 100), 500)

  let q = auth.supabase
    .from('website_leads')
    .select('*')
    .eq('contractor_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return serverError('Failed to load leads', error.message)
  return NextResponse.json({ leads: data || [] })
}
