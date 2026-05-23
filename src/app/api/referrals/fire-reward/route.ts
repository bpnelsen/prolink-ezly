import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { serviceClient, badRequest, forbidden, serverError } from '@/lib/server-auth'

export const runtime = 'nodejs'

const REFERRAL_TRIAL_EXTENSION_DAYS = Number(
  process.env.REFERRAL_TRIAL_EXTENSION_DAYS ?? 14
)

const fireSchema = z.object({
  referredUserId: z.string().uuid(),
})

/**
 * POST /api/referrals/fire-reward  Body: { referredUserId }
 *
 * Called from the Stripe webhook handler when the referred user makes their
 * first successful paid charge. Bumps the referrer's customers.trial_ends_at
 * by REFERRAL_TRIAL_EXTENSION_DAYS (default 14). Idempotent. Protected by
 * INTERNAL_API_SECRET.
 */
export async function POST(req: NextRequest) {
  if (req.headers.get('x-internal-secret') !== process.env.INTERNAL_API_SECRET) {
    return forbidden()
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('invalid_json')
  }

  const parsed = fireSchema.safeParse(body)
  if (!parsed.success) return badRequest('invalid_body', parsed.error.flatten())

  const { referredUserId } = parsed.data
  const svc = serviceClient()

  const { data: ref, error: refErr } = await svc
    .from('referrals')
    .select('*')
    .eq('referred_user_id', referredUserId)
    .maybeSingle()
  if (refErr) return serverError(refErr.message)
  if (!ref) return NextResponse.json({ ok: true, noop: 'not_referred' })
  if (ref.status === 'reward_applied') {
    return NextResponse.json({ ok: true, already: true })
  }

  // Extend the referrer's trial via customers.trial_ends_at (the same column
  // the Stripe subscription webhook keeps in sync). customers.id is the
  // Supabase auth user id, so we look up by referrer_user_id directly.
  const { data: customer, error: custErr } = await svc
    .from('customers')
    .select('id, trial_ends_at')
    .eq('id', ref.referrer_user_id)
    .maybeSingle()
  if (custErr) return serverError(custErr.message)

  const now = new Date()
  const baseEnd = customer?.trial_ends_at ? new Date(customer.trial_ends_at) : now
  const newEnd = new Date(
    Math.max(baseEnd.getTime(), now.getTime()) +
      REFERRAL_TRIAL_EXTENSION_DAYS * 86_400_000
  )

  const { error: upErr } = await svc
    .from('customers')
    .update({ trial_ends_at: newEnd.toISOString() })
    .eq('id', ref.referrer_user_id)
  if (upErr) return serverError(upErr.message)

  const { error: updRefErr } = await svc
    .from('referrals')
    .update({
      status: 'reward_applied',
      converted_at: ref.converted_at ?? now.toISOString(),
      reward_applied_at: now.toISOString(),
      reward_metadata: {
        trial_extended_until: newEnd.toISOString(),
        days_added: REFERRAL_TRIAL_EXTENSION_DAYS,
      },
    })
    .eq('id', ref.id)
  if (updRefErr) return serverError(updRefErr.message)

  return NextResponse.json({
    ok: true,
    referrer: ref.referrer_user_id,
    newTrialEndsAt: newEnd.toISOString(),
  })
}
