import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  JACK_TOOLS,
  READ_TOOLS,
  executeReadTool,
  refillPriceBook,
  formatWhen,
  type Proposal,
  normalizeLineItems,
  computeTotals,
  resolveCustomer,
  splitName,
} from './tools'

export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are "Jack" — a veteran construction foreman with 30+ years of hands-on experience in residential and light commercial trades (HVAC, plumbing, electrical, roofing, remodeling, and general contracting).

Your role: Be the contractor's trusted on-the-job advisor. When they're on a job site, stuck on a quoting decision, or dealing with a tricky customer situation — you're their silent partner with the answers.

Personality & tone:
- Calm, practical, no-nonsense — like a foreman who's seen everything twice
- Speak in plain contractor language, not jargon
- Always err on the side of safety and code compliance
- When uncertain, say "Based on what I can see..." and offer options

Your expertise covers:
- Building codes (IRC, NEC, UPC, local amendments)
- Trade best practices and material selection
- Job site safety (OSHA standards and practical safety)
- Scope-of-work writing and change order language
- Customer communication and de-escalation
- Material cost estimation (current market rates)
- Permit and inspection requirements
- Profit-margin advice for contractors

When a contractor asks about a specific job situation, always:
1. Acknowledge the situation first
2. Give a direct, actionable answer
3. Flag any code, safety, or liability concerns clearly
4. If the question is vague, ask for key details (address, trade, scope)

You can take actions in the contractor's account using the provided tools. Call the matching tool whenever the contractor asks — never claim you lack access to their data:
- get_schedule: to answer ANY schedule/calendar question (today, this week, upcoming, a customer's jobs). Read-only — call it, then answer from the result.
- get_material_prices: to look up the contractor's own prices. Read-only.
- create_quote / update_quote: to create a new draft quote, or change an existing draft quote. Include every line item with quantity and dollar rate. For an update, send the COMPLETE new line-item list (it replaces the old one).
- add_material: to save an item and its standard price to the contractor's price book.
- refill_price_book: to populate the price book from the contractor's past quotes (when they ask to refill/rebuild/import/seed it from history).
- create_customer / update_customer: to add a new customer, or change a customer's phone, email, address, or name.
- create_job: to open a new job for an existing customer.
- schedule_job: to schedule or reschedule a job to a date/time.

Pricing: BEFORE you build or update a quote, call get_material_prices and price each line item from the contractor's own price book and recent quotes. If an item isn't in their pricing, give a reasonable market estimate, say it's an estimate, and offer to save it to their price book.

Before finalizing a quote, briefly ask about commonly-missed items — disposal/haul fees, small parts (wax rings, fittings, fasteners), permit costs, and whether sales tax applies — then call the tool. Every write action is shown to the contractor for approval before anything saves, so don't ask for separate confirmation in text; just call the tool.

Do NOT:
- Make up specific code sections (cite general codes, not fictional section numbers)
- Be overly cautious to the point of being unhelpful
- Offer legal advice — always recommend they consult a licensed engineer or attorney for liability questions`

// Cap input to bound cost-amplification if someone gets past auth.
const MAX_PROMPT_CHARS = 8_000
// How far back the History button reaches.
const HISTORY_DAYS = 15
// How many prior turns we feed the model for context. Keeps follow-ups
// coherent without ballooning token cost on every request.
const MEMORY_TURNS = 12
// Max model round-trips per request (read-tool calls loop back in; writes and
// plain replies end it). Bounds latency and cost.
const MAX_STEPS = 4
const OFFLINE_MSG = 'Jack is off-site right now. Try again in a moment.'

// Per-user rate limit. Uses Node process memory — fine for the current
// single-region Vercel deployment; a Redis-backed limiter is the right next
// step once the app scales horizontally.
type Bucket = { count: number; resetAt: number }
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT_PER_WINDOW = 20
const buckets: Map<string, Bucket> = (globalThis as any).__jackBuckets ??= new Map<string, Bucket>()

function checkRate(key: string): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return { ok: true, retryAfter: 0 }
  }
  if (b.count >= RATE_LIMIT_PER_WINDOW) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) }
  }
  b.count++
  return { ok: true, retryAfter: 0 }
}

type ChatTurn = { role: 'user' | 'ai'; content: string }

// Pull a clean, capped list of recent turns from whatever the client sent.
function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return []
  const turns: ChatTurn[] = []
  for (const item of raw) {
    const role = (item as { role?: unknown })?.role
    const content = (item as { content?: unknown })?.content
    if ((role === 'user' || role === 'ai') && typeof content === 'string' && content.trim()) {
      turns.push({ role, content: content.slice(0, MAX_PROMPT_CHARS) })
    }
  }
  return turns.slice(-MEMORY_TURNS)
}

// Persist a single turn. Best-effort: a logging failure must never break chat.
async function persist(supabase: SupabaseClient, userId: string, role: 'user' | 'ai', content: string) {
  try {
    await supabase.from('jack_messages').insert({ user_id: userId, role, content })
  } catch (err) {
    console.error('Jack persist error:', err)
  }
}

// GET /api/jack — the last HISTORY_DAYS of this user's Jack log,
// oldest first, ready to drop straight into the chat panel.
export async function GET(req: NextRequest) {
  const authed = await requireUser(req)
  if ('error' in authed) return authed.error

  const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await authed.supabase
    .from('jack_messages')
    .select('role, content, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Jack history error:', error)
    return NextResponse.json({ messages: [], error: 'history_unavailable' }, { status: 200 })
  }
  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(req: NextRequest) {
  const authed = await requireUser(req)
  if ('error' in authed) return authed.error
  const { user, supabase } = authed

  const rate = checkRate(user.id)
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Slow down — try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_request', message: 'Invalid JSON' }, { status: 400 })
  }

  const prompt = (body as { prompt?: unknown })?.prompt
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'bad_request', message: 'prompt is required' }, { status: 400 })
  }
  const trimmed = prompt.slice(0, MAX_PROMPT_CHARS).trim()
  if (!trimmed) {
    return NextResponse.json({ error: 'bad_request', message: 'prompt is required' }, { status: 400 })
  }

  // Optional live job context, kept OUT of the stored history so the saved
  // log stays clean — it's only mixed into the model's view of this turn.
  const rawContext = (body as { context?: unknown })?.context
  const context = typeof rawContext === 'string' ? rawContext.slice(0, MAX_PROMPT_CHARS) : ''
  const history = sanitizeHistory((body as { history?: unknown })?.history)

  // Save the user's clean message immediately so it survives even if the
  // model call below fails.
  await persist(supabase, user.id, 'user', trimmed)

  const apiKey = process.env.OPENROUTER_API_KEY
  let response: string
  let proposal: Proposal | null = null

  if (!apiKey) {
    response = 'Jack is offline. OpenRouter API key is not configured.'
  } else {
    const userContent = context ? `${trimmed}\n\n[CURRENT JOB CONTEXT]\n${context}` : trimmed
    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `Current date: ${new Date().toISOString().slice(0, 10)} (UTC). Use it to resolve relative dates like "today", "tomorrow", or "next Tuesday".` },
      ...history.map(t => ({ role: t.role === 'ai' ? 'assistant' : 'user', content: t.content })),
      { role: 'user', content: userContent },
    ]
    const result = await runConversation(apiKey, supabase, user.id, messages)
    response = result.response
    proposal = result.proposal
  }

  await persist(supabase, user.id, 'ai', response)
  return NextResponse.json({ response, proposal })
}

// Drive the model with tools. Read tool-calls execute server-side and loop back
// in; a write tool-call becomes an approval Proposal; plain content ends it.
async function runConversation(
  apiKey: string,
  supabase: SupabaseClient,
  userId: string,
  messages: any[],
): Promise<{ response: string; proposal: Proposal | null }> {
  for (let step = 0; step < MAX_STEPS; step++) {
    let data: any
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://app.useezly.com',
          'X-Title': 'Prolink Jack',
        },
        body: JSON.stringify({
          model: 'google/gemini-3.1-flash-lite-preview',
          messages,
          tools: JACK_TOOLS,
          tool_choice: 'auto',
          max_tokens: 1024,
        }),
      })
      if (!res.ok) {
        // Never echo the upstream body to the client — it can include the API
        // key on auth failures. Log status + body server-side only.
        const detail = await res.text().catch(() => '')
        console.error('OpenRouter error:', res.status, detail.slice(0, 500))
        return { response: OFFLINE_MSG, proposal: null }
      }
      data = await res.json()
    } catch (err) {
      console.error('Jack route error:', err)
      return { response: OFFLINE_MSG, proposal: null }
    }

    const msg = data.choices?.[0]?.message
    const toolCalls = msg?.tool_calls
    if (!toolCalls || toolCalls.length === 0) {
      return { response: msg?.content || 'No response from Jack.', proposal: null }
    }

    // A write tool-call short-circuits into an approval Proposal.
    if (!READ_TOOLS.has(toolCalls[0]?.function?.name)) {
      return buildProposal(supabase, userId, toolCalls[0])
    }

    // Read tool-calls: execute and feed the results back for another round.
    messages.push({ role: 'assistant', content: msg.content ?? '', tool_calls: toolCalls })
    for (const tc of toolCalls) {
      let args: any = {}
      try { args = JSON.parse(tc?.function?.arguments || '{}') } catch { args = {} }
      const out = READ_TOOLS.has(tc?.function?.name)
        ? await executeReadTool(supabase, userId, tc.function.name, args)
        : JSON.stringify({ error: 'not available' })
      messages.push({ role: 'tool', tool_call_id: tc.id, content: out })
    }
  }
  return { response: "I looked into that but couldn't wrap it up — can you narrow it down a bit?", proposal: null }
}

const FIELD_LABELS: Record<string, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  phone: 'Phone',
  email: 'Email',
  address_line1: 'Address',
  city: 'City',
  state: 'State',
  zip_code: 'Zip',
  notes: 'Notes',
}

// Turn a write tool-call into a Proposal the contractor can approve. Resolves
// customers/jobs/quotes server-side (RLS-scoped) but never writes — writes
// happen only on approval via POST /api/jack/action.
async function buildProposal(
  supabase: SupabaseClient,
  userId: string,
  toolCall: any,
): Promise<{ response: string; proposal: Proposal | null }> {
  let args: any = {}
  try {
    args = JSON.parse(toolCall?.function?.arguments || '{}')
  } catch {
    args = {}
  }
  const name = toolCall?.function?.name

  if (name === 'create_quote') {
    const items = normalizeLineItems(args.line_items)
    if (items.length === 0) {
      return { response: "I couldn't read clear line items for that quote. Can you list the items, quantities and prices?", proposal: null }
    }
    const totals = computeTotals(items, args.tax_rate)
    const res = await resolveCustomer(supabase, args.customer_name)

    if (res.status === 'many') {
      const names = res.clients.map(c => `${c.first_name} ${c.last_name}`.trim()).join(', ')
      return { response: `You have a few customers matching “${args.customer_name}”: ${names}. Which one should this quote go under?`, proposal: null }
    }

    if (res.status === 'none') {
      const nm = splitName(args.customer_name)
      const fullName = `${nm.first_name} ${nm.last_name}`.trim()
      return {
        response: `I don't see “${args.customer_name}” in your customers yet. Approve below and I'll add them and save this as a draft quote.`,
        proposal: {
          type: 'create_quote',
          summary: `Add customer ${fullName} + draft quote — $${totals.total.toFixed(2)}`,
          client_id: null,
          new_client: nm,
          client_name: fullName,
          job_id: null,
          new_job: args.job_title ? { title: String(args.job_title) } : null,
          job_title: args.job_title || null,
          line_items: items,
          ...totals,
          notes: args.notes || null,
        },
      }
    }

    // Exactly one customer — try to attach a job by title, else offer to create it.
    const c = res.client
    const cn = `${c.first_name} ${c.last_name}`.trim()
    let job_id: string | null = null
    let new_job: { title: string } | null = null
    const { data: jobs } = await supabase.from('jobs').select('id, title').eq('client_id', c.id)
    const jl = (jobs ?? []) as { id: string; title: string }[]
    if (args.job_title) {
      const match = jl.find(j => (j.title ?? '').toLowerCase() === String(args.job_title).toLowerCase())
      if (match) job_id = match.id
      else new_job = { title: String(args.job_title) }
    } else if (jl.length === 1) {
      job_id = jl[0].id
    }

    return {
      response: `Here's the draft quote for ${cn} — review it and hit Approve to save it as a draft invoice.`,
      proposal: {
        type: 'create_quote',
        summary: `Draft quote for ${cn} — $${totals.total.toFixed(2)}`,
        client_id: c.id,
        new_client: null,
        client_name: cn,
        job_id,
        new_job,
        job_title: args.job_title || null,
        line_items: items,
        ...totals,
        notes: args.notes || null,
      },
    }
  }

  if (name === 'update_quote') {
    const items = normalizeLineItems(args.line_items)
    if (items.length === 0) {
      return { response: "I couldn't read the updated line items. Can you list them out?", proposal: null }
    }
    const totals = computeTotals(items, args.tax_rate)
    const res = await resolveCustomer(supabase, args.customer_name)
    if (res.status === 'none') return { response: `I don't see “${args.customer_name}” in your customers.`, proposal: null }
    if (res.status === 'many') {
      const names = res.clients.map(c => `${c.first_name} ${c.last_name}`.trim()).join(', ')
      return { response: `Which customer? Several match “${args.customer_name}”: ${names}.`, proposal: null }
    }
    const c = res.client
    const cn = `${c.first_name} ${c.last_name}`.trim()
    const { data: drafts } = await supabase
      .from('invoices')
      .select('id, invoice_number, jobs(title)')
      .eq('client_id', c.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
    const dl = (drafts ?? []) as { id: string; invoice_number: string; jobs?: { title?: string } | null }[]
    if (dl.length === 0) return { response: `${cn} doesn't have a draft quote to update. Want me to create one instead?`, proposal: null }

    let target = dl[0]
    if (args.invoice_number) {
      const want = String(args.invoice_number).replace('#', '').trim()
      const m = dl.find(d => d.invoice_number.replace('#', '').trim() === want)
      if (!m) return { response: `I couldn't find quote ${args.invoice_number} for ${cn}. They have: ${dl.map(d => d.invoice_number).join(', ')}.`, proposal: null }
      target = m
    } else if (dl.length > 1) {
      return { response: `${cn} has multiple draft quotes (${dl.map(d => d.invoice_number).join(', ')}). Which number should I update?`, proposal: null }
    }

    return {
      response: `Here's the updated quote ${target.invoice_number} for ${cn} — review and Approve to save the changes.`,
      proposal: {
        type: 'update_quote',
        summary: `Update quote ${target.invoice_number} for ${cn} — $${totals.total.toFixed(2)}`,
        invoice_id: target.id,
        invoice_number: target.invoice_number,
        client_name: cn,
        job_title: target.jobs?.title ?? null,
        line_items: items,
        ...totals,
        notes: typeof args.notes === 'string' ? args.notes : null,
      },
    }
  }

  if (name === 'create_customer') {
    const first = String(args.first_name || '').trim()
    const last = String(args.last_name || '').trim()
    if (!first) return { response: "What's the customer's name?", proposal: null }
    return {
      response: `Add ${`${first} ${last}`.trim()} to your customers? Approve to confirm.`,
      proposal: {
        type: 'create_customer',
        summary: `Add customer ${`${first} ${last}`.trim()}`,
        first_name: first,
        last_name: last,
        phone: args.phone || null,
        email: args.email || null,
        address: args.address || null,
        city: args.city || null,
        state: args.state || null,
        zip: args.zip || null,
      },
    }
  }

  if (name === 'update_customer') {
    const res = await resolveCustomer(supabase, args.customer_name)
    if (res.status === 'none') return { response: `I don't see “${args.customer_name}” in your customers.`, proposal: null }
    if (res.status === 'many') {
      const names = res.clients.map(c => `${c.first_name} ${c.last_name}`.trim()).join(', ')
      return { response: `Which customer? Several match “${args.customer_name}”: ${names}.`, proposal: null }
    }
    const c = res.client
    const cn = `${c.first_name} ${c.last_name}`.trim()
    const changes: Record<string, string> = {}
    const fields: [string, unknown][] = [
      ['first_name', args.first_name], ['last_name', args.last_name], ['phone', args.phone],
      ['email', args.email], ['address_line1', args.address], ['city', args.city],
      ['state', args.state], ['zip_code', args.zip], ['notes', args.notes],
    ]
    for (const [k, v] of fields) {
      if (typeof v === 'string' && v.trim()) changes[k] = v.trim()
    }
    if (Object.keys(changes).length === 0) return { response: `What would you like to change for ${cn}?`, proposal: null }
    const human = Object.entries(changes).map(([k, v]) => `${FIELD_LABELS[k] ?? k}: ${v}`).join(', ')
    return {
      response: `Update ${cn} — ${human}? Approve to confirm.`,
      proposal: { type: 'update_customer', summary: `Update ${cn}`, client_id: c.id, client_name: cn, changes },
    }
  }

  if (name === 'refill_price_book') {
    const { candidates } = await refillPriceBook(supabase, userId, { commit: false })
    if (candidates.length === 0) {
      return { response: 'Your price book already covers everything in your past quotes — nothing new to add.', proposal: null }
    }
    const preview = candidates.slice(0, 6).map(c => `${c.name} ($${c.unit_price.toFixed(2)}/${c.unit})`).join(', ')
    const more = candidates.length > 6 ? `, e.g. ${preview}` : `: ${preview}`
    return {
      response: `I can add ${candidates.length} item${candidates.length > 1 ? 's' : ''} from your past quotes${more}. Approve to add them to your price book.`,
      proposal: { type: 'refill_price_book', summary: `Add ${candidates.length} item${candidates.length > 1 ? 's' : ''} to your price book from past quotes` },
    }
  }

  if (name === 'add_material') {
    const matName = String(args.name || '').trim()
    const price = Number(args.unit_price)
    if (!matName || !Number.isFinite(price)) {
      return { response: 'What item and price should I add to your price book?', proposal: null }
    }
    const unitRaw = String(args.unit || 'ea').toLowerCase().trim()
    const unit = ['ea', 'hr', 'sqft', 'lft', 'day', 'lot'].includes(unitRaw) ? unitRaw : 'ea'
    return {
      response: `Add “${matName}” to your price book at $${price.toFixed(2)}/${unit}? Approve to confirm.`,
      proposal: {
        type: 'add_material',
        summary: `Add “${matName}” — $${price.toFixed(2)}/${unit}`,
        name: matName,
        unit,
        unit_price: price,
        unit_cost: Number.isFinite(Number(args.unit_cost)) ? Number(args.unit_cost) : null,
        category: args.category || null,
      },
    }
  }

  if (name === 'create_job') {
    const title = String(args.title || '').trim()
    if (!title) return { response: 'What should I call this job?', proposal: null }
    const res = await resolveCustomer(supabase, args.customer_name)
    if (res.status === 'one') {
      const c = res.client
      const cn = `${c.first_name} ${c.last_name}`.trim()
      return {
        response: `Create job “${title}” under ${cn}? Approve to confirm.`,
        proposal: { type: 'create_job', summary: `New job “${title}” for ${cn}`, client_id: c.id, client_name: cn, title, description: args.description || null },
      }
    }
    if (res.status === 'many') {
      return { response: `Which customer is this job for? Several match “${args.customer_name}”.`, proposal: null }
    }
    return { response: `I don't see “${args.customer_name}” in your customers. Want me to add them first?`, proposal: null }
  }

  if (name === 'schedule_job') {
    const start = new Date(args.start)
    if (isNaN(start.getTime())) return { response: 'What date and time should I schedule it for?', proposal: null }
    const dur = Number(args.duration_hours)
    const end = new Date(start.getTime() + (Number.isFinite(dur) && dur > 0 ? dur : 2) * 3600 * 1000)
    const res = await resolveCustomer(supabase, args.customer_name)
    if (res.status === 'none') return { response: `I don't see “${args.customer_name}” in your customers.`, proposal: null }
    if (res.status === 'many') {
      const names = res.clients.map(c => `${c.first_name} ${c.last_name}`.trim()).join(', ')
      return { response: `Which customer? Several match “${args.customer_name}”: ${names}.`, proposal: null }
    }
    const c = res.client
    const cn = `${c.first_name} ${c.last_name}`.trim()
    const { data: jobs } = await supabase.from('jobs').select('id, title').eq('client_id', c.id).order('created_at', { ascending: false })
    const jl = (jobs ?? []) as { id: string; title: string }[]
    if (jl.length === 0) return { response: `${cn} doesn't have a job yet. Want me to create one first?`, proposal: null }
    let job = jl[0]
    if (args.job_title) {
      const m = jl.find(j => (j.title ?? '').toLowerCase().includes(String(args.job_title).toLowerCase()))
      if (!m) return { response: `Which job for ${cn}? They have: ${jl.map(j => j.title).join(', ')}.`, proposal: null }
      job = m
    } else if (jl.length > 1) {
      return { response: `${cn} has multiple jobs (${jl.map(j => j.title).join(', ')}). Which one should I schedule?`, proposal: null }
    }
    return {
      response: `Schedule “${job.title}” for ${formatWhen(start)}? Approve to confirm.`,
      proposal: {
        type: 'schedule_job',
        summary: `Schedule “${job.title}” for ${formatWhen(start)}`,
        job_id: job.id,
        job_title: job.title,
        client_name: cn,
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
      },
    }
  }

  return { response: 'No response from Jack.', proposal: null }
}
