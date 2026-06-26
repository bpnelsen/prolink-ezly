import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAdmin, badRequest, serverError } from '@/lib/server-auth'
import { physicalAddress, renderForRecipient } from '@/lib/crm-campaign-render'
import type { ImportedContractor } from '@/lib/crm-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const FROM = process.env.CRM_FROM_EMAIL || 'Brian Nelsen <Brian@useezly.com>'
const REPLY_TO = process.env.CRM_REPLY_TO || ''
const BATCH_SIZE = 100

type Filter = {
  q?: string
  state?: string
  contact_status?: string
  stage?: string
}

// GET — list campaigns (most recent first).
export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  const { data, error } = await supabase
    .from('crm_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return serverError(error.message)
  return NextResponse.json({ items: data || [] })
}

// POST — create a campaign, render per-recipient, send via Resend batch API,
// log activities, advance contact_status. Returns the campaign row with
// final totals.
//
// Body: { name, subject, body, template_id?, filter: { q, state, contact_status, stage } }
export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return serverError('Resend is not configured (missing RESEND_API_KEY).')
  if (!physicalAddress()) {
    return badRequest(
      'CRM_PHYSICAL_ADDRESS must be set before sending campaigns. CAN-SPAM requires a physical mailing address in every cold-outreach email footer.',
    )
  }

  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase, user } = gate

  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const name = (body?.name || '').toString().trim()
  const subject = (body?.subject || '').toString().trim()
  const messageBody = (body?.body || '').toString()
  const templateId = body?.template_id || null
  const filter: Filter = body?.filter || {}

  if (!name) return badRequest('name is required')
  if (!subject) return badRequest('subject is required')
  if (!messageBody) return badRequest('body is required')

  // Resolve sender display name (env → profile → email prefix).
  let senderName = process.env.CRM_SENDER_NAME || ''
  if (!senderName) {
    const { data: prof } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    senderName = prof?.full_name || user.email?.split('@')[0] || ''
  }

  // Resolve recipients via the same filter shape the contractors list uses.
  let query = supabase.from('imported_contractors').select('*, deal:crm_deals(stage_key)')
  if (filter.q) query = query.ilike('business_name', `%${filter.q}%`)
  if (filter.state) query = query.eq('state', filter.state)
  if (filter.contact_status) query = query.eq('contact_status', filter.contact_status)

  const { data: rawContractors, error: cErr } = await query.limit(5000)
  if (cErr) return serverError(cErr.message)

  let contractors = (rawContractors || []).map((c: any) => ({
    ...c,
    deal: Array.isArray(c.deal) ? c.deal[0] || null : c.deal || null,
  }))
  if (filter.stage) {
    contractors = contractors.filter((c: any) => c.deal?.stage_key === filter.stage)
  }

  if (contractors.length === 0) {
    return badRequest('No contractors matched the filter.')
  }

  // Insert the campaign row up front so we have an id for recipients.
  const { data: campaign, error: campErr } = await supabase
    .from('crm_campaigns')
    .insert({
      name, subject, body: messageBody, template_id: templateId,
      filter_json: filter, status: 'sending',
      total_recipients: contractors.length,
      created_by_email: user.email,
      started_at: new Date().toISOString(),
    })
    .select('*').single()
  if (campErr) return serverError(campErr.message)

  // Pre-classify recipients. Even skipped ones get a row so the audit trail
  // shows what would have happened.
  type RecipientSeed = {
    contractor: ImportedContractor
    initialStatus: 'queued' | 'skipped_dnc' | 'skipped_no_email'
  }
  const seeds: RecipientSeed[] = contractors.map((c: ImportedContractor) => {
    if (c.contact_status === 'do_not_contact') return { contractor: c, initialStatus: 'skipped_dnc' as const }
    if (!c.email) return { contractor: c, initialStatus: 'skipped_no_email' as const }
    return { contractor: c, initialStatus: 'queued' as const }
  })

  const { data: recipientsInserted, error: rErr } = await supabase
    .from('crm_campaign_recipients')
    .insert(seeds.map(s => ({
      campaign_id: campaign.id,
      contractor_id: s.contractor.id,
      email: s.contractor.email || '',
      status: s.initialStatus,
    })))
    .select('id, contractor_id, unsubscribe_token, status')
  if (rErr) {
    await supabase.from('crm_campaigns').update({ status: 'cancelled', finished_at: new Date().toISOString() }).eq('id', campaign.id)
    return serverError(rErr.message)
  }

  // Build a lookup from contractor_id → recipient row (for token + id).
  const recipientByContractor = new Map<string, { id: string; unsubscribe_token: string }>()
  for (const r of recipientsInserted || []) {
    recipientByContractor.set(r.contractor_id, { id: r.id, unsubscribe_token: r.unsubscribe_token })
  }

  // Build the actually-sendable list.
  const sendable = seeds.filter(s => s.initialStatus === 'queued')
  let skippedCount = seeds.length - sendable.length
  let sentCount = 0
  let failedCount = 0
  const sentContractorIds: string[] = []

  const resend = new Resend(apiKey)

  for (let i = 0; i < sendable.length; i += BATCH_SIZE) {
    const chunk = sendable.slice(i, i + BATCH_SIZE)
    const payloads = chunk.map(s => {
      const recip = recipientByContractor.get(s.contractor.id)!
      const rendered = renderForRecipient({
        contractor: s.contractor,
        subject, body: messageBody,
        senderName, senderEmail: user.email,
        unsubscribeToken: recip.unsubscribe_token,
      })
      return {
        from: FROM,
        to: s.contractor.email!,
        ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
        subject: rendered.subject,
        html: rendered.bodyHtml,
        text: rendered.bodyText,
      }
    })

    let batchData: Array<{ id?: string }> | null = null
    let batchError: string | null = null
    try {
      const res = await (resend as any).batch.send(payloads)
      if (res?.error) {
        batchError = res.error.message || 'Batch send failed'
      } else {
        batchData = res?.data?.data || res?.data || null
      }
    } catch (e) {
      batchError = (e as Error).message
    }

    // Update each recipient row + bookkeeping.
    for (let j = 0; j < chunk.length; j++) {
      const s = chunk[j]
      const recip = recipientByContractor.get(s.contractor.id)!
      const result = batchData?.[j]
      if (batchError) {
        await supabase.from('crm_campaign_recipients')
          .update({ status: 'failed', error_msg: batchError })
          .eq('id', recip.id)
        failedCount++
      } else if (result?.id) {
        await supabase.from('crm_campaign_recipients')
          .update({ status: 'sent', sent_at: new Date().toISOString(), resend_message_id: result.id })
          .eq('id', recip.id)
        sentCount++
        sentContractorIds.push(s.contractor.id)
      } else {
        await supabase.from('crm_campaign_recipients')
          .update({ status: 'failed', error_msg: 'No message id returned' })
          .eq('id', recip.id)
        failedCount++
      }
    }
  }

  // Log a per-recipient activity for everything actually sent.
  if (sentContractorIds.length > 0) {
    const now = new Date().toISOString()
    // Fetch deal_ids in bulk so each activity attaches to the right deal.
    const { data: deals } = await supabase
      .from('crm_deals').select('id, contractor_id')
      .in('contractor_id', sentContractorIds)
    const dealByContractor = new Map<string, string>()
    for (const d of deals || []) dealByContractor.set((d as any).contractor_id, (d as any).id)

    const activityRows = sentContractorIds.map(cid => ({
      contractor_id: cid,
      deal_id: dealByContractor.get(cid) || null,
      kind: 'email' as const,
      subject: `[Campaign: ${name}] ${subject}`,
      body: messageBody,
      completed: true,
      completed_at: now,
      owner_email: user.email,
    }))
    await supabase.from('crm_activities').insert(activityRows)

    // Bump contact_date for everyone we touched. Promote contact_status to
    // 'contacted' only when current is null or 'new' (guarded — don't trample
    // qualified/unqualified/etc.). Two updates because PostgREST chaining
    // doesn't support an OR over null + value cleanly.
    await supabase.from('imported_contractors')
      .update({ contact_date: now })
      .in('id', sentContractorIds)
    await supabase.from('imported_contractors')
      .update({ contact_status: 'contacted' })
      .in('id', sentContractorIds)
      .is('contact_status', null)
    await supabase.from('imported_contractors')
      .update({ contact_status: 'contacted' })
      .in('id', sentContractorIds)
      .eq('contact_status', 'new')
  }

  const { data: finalCampaign } = await supabase
    .from('crm_campaigns')
    .update({
      status: 'done',
      sent_count: sentCount,
      failed_count: failedCount,
      skipped_count: skippedCount,
      finished_at: new Date().toISOString(),
    })
    .eq('id', campaign.id)
    .select('*').single()

  return NextResponse.json({ campaign: finalCampaign || campaign })
}
