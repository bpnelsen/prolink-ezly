import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server-auth'

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

export async function POST(req: NextRequest) {
  const authed = await requireUser(req)
  if ('error' in authed) return authed.error

  const rate = checkRate(authed.user.id)
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
  const trimmed = prompt.slice(0, MAX_PROMPT_CHARS)

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { response: 'Foreman is offline. OpenRouter API key is not configured.' },
      { status: 200 },
    )
  }

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
        model: 'anthropic/claude-haiku-4-5-20251001',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: trimmed },
        ],
        max_tokens: 1024,
      }),
    })

    if (!res.ok) {
      // Never echo the upstream body back — it can include the API key on auth
      // failures, model errors, etc. Log on the server only.
      console.error('OpenRouter error:', res.status)
      return NextResponse.json(
        { response: 'Foreman is off-site right now. Try again in a moment.' },
        { status: 200 },
      )
    }

    const data = await res.json()
    const response = data.choices?.[0]?.message?.content || 'No response from Foreman.'
    return NextResponse.json({ response })
  } catch (err) {
    console.error('Foreman route error:', err)
    return NextResponse.json(
      { response: 'Foreman is off-site right now. Try again in a moment.' },
      { status: 200 },
    )
  }
}
