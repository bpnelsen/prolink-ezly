import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export const runtime = 'nodejs'

function hashIp(ip: string): string {
  const salt = process.env.CONSENT_IP_SALT || 'ezly-consent'
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ ok: false, error: 'supabase_not_configured' }, { status: 200 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const required = ['anonymous_id', 'regime', 'consent', 'policy_version', 'ui_version']
  for (const k of required) {
    if (body[k] === undefined || body[k] === null) {
      return NextResponse.json({ ok: false, error: `missing_${k}` }, { status: 400 })
    }
  }

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || ''
  const userAgent = req.headers.get('user-agent') || ''

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { error } = await supabase.from('consent_logs').insert({
    anonymous_id: String(body.anonymous_id),
    regime: String(body.regime),
    jurisdiction_country: body.jurisdiction_country ? String(body.jurisdiction_country) : null,
    jurisdiction_region: body.jurisdiction_region ? String(body.jurisdiction_region) : null,
    consent: body.consent,
    gpc_signal: Boolean(body.gpc_signal),
    policy_version: String(body.policy_version),
    ui_version: String(body.ui_version),
    user_agent: userAgent,
    ip_hash: ip ? hashIp(ip) : null,
  })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
