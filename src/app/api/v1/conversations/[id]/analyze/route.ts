import { NextRequest, NextResponse } from 'next/server'
import { requireUser, notFound, serverError } from '../../../../../../lib/server-auth'

export const runtime = 'nodejs'

const MODEL = 'google/gemini-3.1-flash-lite-preview'
const SECTIONS = [
  'scope', 'pricing', 'schedule', 'decisions', 'action_items',
  'change_order_opportunities', 'value_engineering', 'upgrade_opportunities',
] as const
type Section = (typeof SECTIONS)[number]

const SYSTEM_PROMPT = `You are a veteran construction project manager and estimator. You read a conversation between a contractor and their client and turn it into a structured "deal plan" so the contractor never has to re-read the thread to remember details.

Extract ONLY information actually supported by the conversation. Never invent prices, dates, or commitments. Be conservative — if something is ambiguous, capture it as a decision/open question rather than a firm fact.

Beyond plain extraction, proactively apply professional judgment to surface:
- change_order_opportunities: scope the client raised that is outside the original job and should be a written change order (with a rough rationale).
- value_engineering: ways to hit the client's goals for less cost or risk.
- upgrade_opportunities: legitimate upsells/upgrades that genuinely benefit this client given what they said.

Allowed sections: scope, pricing, schedule, decisions, action_items, change_order_opportunities, value_engineering, upgrade_opportunities.

Return ONLY valid JSON, no markdown, with this exact shape:
{
  "suggestions": [
    {
      "section": "<one allowed section>",
      "operation": "add",
      "payload": { "title": "short label", "detail": "1-2 sentence specifics", "amount": null, "due_date": null },
      "rationale": "why this matters / why you inferred it",
      "source_quote": "the client/contractor words this is based on"
    }
  ]
}
Use null for amount/due_date when not stated. Limit to the 12 most useful, non-duplicative items.`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { user, supabase } = auth

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, job_id')
    .eq('id', params.id)
    .single()
  if (!conversation) return notFound('Conversation not found')

  const { data: dealPlan } = await supabase
    .from('deal_plans')
    .select('id')
    .eq('job_id', conversation.job_id)
    .single()
  if (!dealPlan) return notFound('Deal plan not found')

  const { data: messages } = await supabase
    .from('messages')
    .select('sender_role, sender_name, body, created_at')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true })

  // Always advance the analyzed marker so the client-reply auto-trigger
  // doesn't loop even if there's nothing new/usable.
  const stamp = async () =>
    supabase.from('conversations').update({ last_analyzed_at: new Date().toISOString() }).eq('id', conversation.id)

  if (!messages || messages.length === 0) {
    await stamp()
    return NextResponse.json({ data: { inserted: 0 } })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    await stamp()
    return NextResponse.json({ data: { inserted: 0, warning: 'AI is not configured (OPENROUTER_API_KEY missing).' } })
  }

  const transcript = (messages as Row[])
    .map(m => `${m.sender_role === 'contractor' ? 'CONTRACTOR' : 'CLIENT'} (${m.sender_name || ''}): ${m.body}`)
    .join('\n')

  let aiJson: { suggestions?: unknown[] } = {}
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://app.useezly.com',
        'X-Title': 'Prolink Deal Plan',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Conversation transcript:\n\n${transcript}` },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    })
    if (!res.ok) {
      await stamp()
      return NextResponse.json({ data: { inserted: 0, warning: 'AI analysis is temporarily unavailable.' } })
    }
    const data = await res.json()
    const raw: string = data.choices?.[0]?.message?.content ?? '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    aiJson = JSON.parse(cleaned)
  } catch {
    await stamp()
    return NextResponse.json({ data: { inserted: 0, warning: 'Could not parse the AI response.' } })
  }

  const incoming = Array.isArray(aiJson.suggestions) ? aiJson.suggestions : []

  // De-dupe against existing pending/accepted suggestions for this plan.
  const { data: existing } = await supabase
    .from('deal_plan_suggestions')
    .select('section, payload, status')
    .eq('deal_plan_id', dealPlan.id)
    .neq('status', 'rejected')
  const seen = new Set(
    (existing || []).map((s: Row) => `${s.section}|${JSON.stringify(s.payload)}`)
  )

  const rows: Row[] = []
  for (const item of incoming.slice(0, 20)) {
    const s = item as Row
    const section = String(s.section || '') as Section
    if (!SECTIONS.includes(section)) continue
    if (s.payload == null || typeof s.payload !== 'object') continue
    const key = `${section}|${JSON.stringify(s.payload)}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({
      deal_plan_id: dealPlan.id,
      conversation_id: conversation.id,
      contractor_id: user.id,
      section,
      operation: ['add', 'update', 'remove'].includes(s.operation) ? s.operation : 'add',
      payload: s.payload,
      rationale: typeof s.rationale === 'string' ? s.rationale.slice(0, 1000) : null,
      source_quote: typeof s.source_quote === 'string' ? s.source_quote.slice(0, 1000) : null,
    })
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('deal_plan_suggestions').insert(rows)
    if (error) return serverError('Failed to save suggestions', error.message)
  }
  await stamp()

  return NextResponse.json({ data: { inserted: rows.length } })
}
