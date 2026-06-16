import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are "Prolink Foreman" — a veteran construction foreman with 30+ years of hands-on experience in residential and light commercial trades (HVAC, plumbing, electrical, roofing, remodeling, and general contracting).

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
const OFFLINE_MSG = 'Foreman is off-site right now. Try again in a moment.'

// Per-user rate limit. Uses Node process memory — fine for the current
// single-region Vercel deployment; a Redis-backed limiter is the right next
// step once the app scales horizontally.
type Bucket = { count: number; resetAt: number }
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT_PER_WINDOW = 20
const buckets: Map<string, Bucket> = (globalThis as any).__foremanBuckets ??= new Map<string, Bucket>()

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
    await supabase.from('foreman_messages').insert({ user_id: userId, role, content })
  } catch (err) {
    console.error('Foreman persist error:', err)
  }
}

// GET /api/foreman — the last HISTORY_DAYS of this user's Foreman log,
// oldest first, ready to drop straight into the chat panel.
export async function GET(req: NextRequest) {
  const authed = await requireUser(req)
  if ('error' in authed) return authed.error

  const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await authed.supabase
    .from('foreman_messages')
    .select('role, content, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Foreman history error:', error)
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

  if (!apiKey) {
    response = 'Foreman is offline. OpenRouter API key is not configured.'
  } else {
    const userContent = context ? `${trimmed}\n\n[CURRENT JOB CONTEXT]\n${context}` : trimmed
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://app.useezly.com',
          'X-Title': 'Prolink Foreman AI',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-haiku-4.5',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history.map(t => ({ role: t.role === 'ai' ? 'assistant' : 'user', content: t.content })),
            { role: 'user', content: userContent },
          ],
          max_tokens: 1024,
        }),
      })

      if (!res.ok) {
        // Never echo the upstream body back to the client — it can include the
        // API key on auth failures, model errors, etc. Log status + body
        // server-side only so failures (bad model slug, 401, 402) are diagnosable.
        const detail = await res.text().catch(() => '')
        console.error('OpenRouter error:', res.status, detail.slice(0, 500))
        response = OFFLINE_MSG
      } else {
        const data = await res.json()
        response = data.choices?.[0]?.message?.content || 'No response from Foreman.'
      }
    } catch (err) {
      console.error('Foreman route error:', err)
      response = OFFLINE_MSG
    }
  }

  await persist(supabase, user.id, 'ai', response)
  return NextResponse.json({ response })
}
