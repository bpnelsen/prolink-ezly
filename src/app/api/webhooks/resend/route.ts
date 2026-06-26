import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { serviceClient } from '@/lib/server-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Resend webhooks are signed with Svix headers. Configure the receiving URL
// + secret in the Resend dashboard (Webhooks → Add endpoint). The secret
// goes in RESEND_WEBHOOK_SECRET. Without it we 401 every request so that a
// misconfigured deploy can't accidentally accept spoofed events.
const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || ''

type ResendEvent = {
  type: string
  created_at?: string
  data: {
    email_id?: string
    to?: string[]
    subject?: string
    open?: { ipAddress?: string; userAgent?: string; timestamp?: string }
    click?: { link?: string; ipAddress?: string; userAgent?: string; timestamp?: string }
    bounce?: { message?: string }
  }
}

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 401 })
  }

  // Svix verification needs the raw body string + the three signing headers.
  const rawBody = await req.text()
  const headers: Record<string, string> = {
    'svix-id':        req.headers.get('svix-id')        || '',
    'svix-timestamp': req.headers.get('svix-timestamp') || '',
    'svix-signature': req.headers.get('svix-signature') || '',
  }

  let event: ResendEvent
  try {
    const wh = new Webhook(WEBHOOK_SECRET)
    event = wh.verify(rawBody, headers) as ResendEvent
  } catch (e) {
    return NextResponse.json(
      { error: 'invalid_signature', detail: (e as Error).message },
      { status: 401 },
    )
  }

  const msgId = event.data?.email_id
  if (!msgId) {
    // Acknowledge events we can't route so Resend stops retrying.
    return NextResponse.json({ ok: true, ignored: 'no email_id' })
  }

  const svc = serviceClient()

  switch (event.type) {
    case 'email.opened':
      await handleOpen(svc, msgId, event)
      break
    case 'email.clicked':
      await handleClick(svc, msgId, event)
      break
    case 'email.bounced':
      await handleBounce(svc, msgId, event)
      break
    case 'email.complained':
      await handleComplaint(svc, msgId)
      break
    // delivered / delivery_delayed / sent etc. are fine to ignore for now.
    default:
      break
  }

  return NextResponse.json({ ok: true })
}

// Two possible parents: a single-send activity row, or a campaign recipient
// row. We try both and update whichever matches. Also log the raw event for
// the audit trail so re-opens are visible chronologically.
async function handleOpen(svc: ReturnType<typeof serviceClient>, msgId: string, event: ResendEvent) {
  const occurredAt = event.data?.open?.timestamp || event.created_at || new Date().toISOString()
  const ip = event.data?.open?.ipAddress || null
  const ua = event.data?.open?.userAgent || null

  // 1. Single-send activities (crm_activities)
  const { data: activity } = await svc
    .from('crm_activities')
    .select('id, contractor_id, first_opened_at, open_count')
    .eq('resend_message_id', msgId)
    .maybeSingle()

  let activityId: string | null = null
  let activityContractorId: string | null = null
  if (activity) {
    activityId = activity.id
    activityContractorId = activity.contractor_id
    await svc.from('crm_activities').update({
      first_opened_at: activity.first_opened_at || occurredAt,
      last_opened_at:  occurredAt,
      open_count:      (activity.open_count || 0) + 1,
    }).eq('id', activity.id)
  }

  // 2. Campaign recipients (crm_campaign_recipients)
  const { data: recipient } = await svc
    .from('crm_campaign_recipients')
    .select('id, contractor_id, campaign_id, first_opened_at, open_count')
    .eq('resend_message_id', msgId)
    .maybeSingle()

  let recipientId: string | null = null
  let recipientContractorId: string | null = null
  let campaignId: string | null = null
  if (recipient) {
    recipientId = recipient.id
    recipientContractorId = recipient.contractor_id
    campaignId = recipient.campaign_id
    await svc.from('crm_campaign_recipients').update({
      first_opened_at: recipient.first_opened_at || occurredAt,
      last_opened_at:  occurredAt,
      open_count:      (recipient.open_count || 0) + 1,
    }).eq('id', recipient.id)
  }

  // 3. Raw event log — every open, even re-opens.
  await svc.from('crm_email_opens').insert({
    resend_message_id: msgId,
    contractor_id:     activityContractorId || recipientContractorId,
    activity_id:       activityId,
    recipient_id:      recipientId,
    campaign_id:       campaignId,
    ip, user_agent: ua,
    occurred_at:       occurredAt,
  })
}

// Click handling mirrors open handling: bump counters on whichever parent
// row matches (single-send activity OR campaign recipient), and log the
// raw event with the clicked URL for the audit trail. A click implies
// the email was also opened, but we let the separate email.opened event
// handle the open counters.
async function handleClick(svc: ReturnType<typeof serviceClient>, msgId: string, event: ResendEvent) {
  const occurredAt = event.data?.click?.timestamp || event.created_at || new Date().toISOString()
  const url = event.data?.click?.link || null
  const ip = event.data?.click?.ipAddress || null
  const ua = event.data?.click?.userAgent || null

  const { data: activity } = await svc
    .from('crm_activities')
    .select('id, contractor_id, first_clicked_at, click_count')
    .eq('resend_message_id', msgId)
    .maybeSingle()

  let activityId: string | null = null
  let activityContractorId: string | null = null
  if (activity) {
    activityId = activity.id
    activityContractorId = activity.contractor_id
    await svc.from('crm_activities').update({
      first_clicked_at: activity.first_clicked_at || occurredAt,
      last_clicked_at:  occurredAt,
      click_count:      (activity.click_count || 0) + 1,
    }).eq('id', activity.id)
  }

  const { data: recipient } = await svc
    .from('crm_campaign_recipients')
    .select('id, contractor_id, campaign_id, first_clicked_at, click_count')
    .eq('resend_message_id', msgId)
    .maybeSingle()

  let recipientId: string | null = null
  let recipientContractorId: string | null = null
  let campaignId: string | null = null
  if (recipient) {
    recipientId = recipient.id
    recipientContractorId = recipient.contractor_id
    campaignId = recipient.campaign_id
    await svc.from('crm_campaign_recipients').update({
      first_clicked_at: recipient.first_clicked_at || occurredAt,
      last_clicked_at:  occurredAt,
      click_count:      (recipient.click_count || 0) + 1,
    }).eq('id', recipient.id)
  }

  await svc.from('crm_email_clicks').insert({
    resend_message_id: msgId,
    contractor_id:     activityContractorId || recipientContractorId,
    activity_id:       activityId,
    recipient_id:      recipientId,
    campaign_id:       campaignId,
    url, ip, user_agent: ua,
    occurred_at:       occurredAt,
  })
}

// Bounce → flag the contractor with do_not_contact (best signal we have
// against burning the domain) and mark the campaign recipient as failed.
async function handleBounce(svc: ReturnType<typeof serviceClient>, msgId: string, event: ResendEvent) {
  const reason = event.data?.bounce?.message || 'bounced'

  const { data: recipient } = await svc
    .from('crm_campaign_recipients')
    .select('id, contractor_id')
    .eq('resend_message_id', msgId)
    .maybeSingle()

  const { data: activity } = await svc
    .from('crm_activities')
    .select('id, contractor_id')
    .eq('resend_message_id', msgId)
    .maybeSingle()

  const contractorId = recipient?.contractor_id || activity?.contractor_id
  if (contractorId) {
    await svc.from('imported_contractors')
      .update({ contact_status: 'do_not_contact' })
      .eq('id', contractorId)
  }
  if (recipient) {
    await svc.from('crm_campaign_recipients')
      .update({ status: 'failed', error_msg: `bounce: ${reason}` })
      .eq('id', recipient.id)
  }
}

// Complaint (recipient hit "spam") → same treatment as bounce.
async function handleComplaint(svc: ReturnType<typeof serviceClient>, msgId: string) {
  const { data: recipient } = await svc
    .from('crm_campaign_recipients')
    .select('contractor_id')
    .eq('resend_message_id', msgId)
    .maybeSingle()
  const { data: activity } = await svc
    .from('crm_activities')
    .select('contractor_id')
    .eq('resend_message_id', msgId)
    .maybeSingle()

  const contractorId = recipient?.contractor_id || activity?.contractor_id
  if (contractorId) {
    await svc.from('imported_contractors')
      .update({ contact_status: 'do_not_contact' })
      .eq('id', contractorId)
  }
}
