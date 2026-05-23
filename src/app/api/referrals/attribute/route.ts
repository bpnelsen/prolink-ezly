import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { serviceClient, badRequest, forbidden, notFound, serverError } from '@/lib/server-auth'

export const runtime = 'nodejs'

const attributeSchema = z.object({
  referredUserId: z.string().uuid(),
  referralCode: z.string().min(4).max(16),
})

/**
 * POST /api/referrals/attribute  Body: { referredUserId, referralCode }
 *
 * Called server-to-server from the signup handler once Supabase has created
 * the new user. Idempotent — a repeat call for the same referredUserId is a
 * no-op. Protected by INTERNAL_API_SECRET because it bypasses RLS.
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

  const parsed = attributeSchema.safeParse(body)
  if (!parsed.success) return badRequest('invalid_body', parsed.error.flatten())

  const { referredUserId, referralCode } = parsed.data
  const svc = serviceClient()

  const { data: code, error: codeErr } = await svc
    .from('referral_codes')
    .select('user_id, code')
    .eq('code', referralCode.toUpperCase())
    .maybeSingle()
  if (codeErr) return serverError(codeErr.message)
  if (!code) return notFound('code_not_found')

  if (code.user_id === referredUserId) {
    return badRequest('self_referral')
  }

  const { error: insertErr } = await svc.from('referrals').insert({
    referrer_user_id: code.user_id,
    referred_user_id: referredUserId,
    referral_code: code.code,
    status: 'signed_up',
  })

  if (insertErr) {
    // 23505 = unique violation on referred_user_id (already attributed) → idempotent no-op
    if ((insertErr as { code?: string }).code === '23505') {
      return NextResponse.json({ ok: true, already: true })
    }
    return serverError(insertErr.message)
  }

  return NextResponse.json({ ok: true })
}
