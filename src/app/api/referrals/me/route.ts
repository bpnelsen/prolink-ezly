import { NextRequest, NextResponse } from 'next/server'
import { customAlphabet } from 'nanoid'
import { requireUser, serviceClient, serverError } from '@/lib/server-auth'

export const runtime = 'nodejs'

const generateCode = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 8)

/**
 * GET /api/referrals/me
 * Returns the caller's referral code (creating one on first call) plus a
 * summary of how their referrals have converted.
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const userId = auth.user.id

  const svc = serviceClient()

  let { data: codeRow, error: codeErr } = await svc
    .from('referral_codes')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (codeErr) return serverError(codeErr.message)

  if (!codeRow) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode()
      const { data, error } = await svc
        .from('referral_codes')
        .insert({ user_id: userId, code })
        .select()
        .single()
      if (!error) {
        codeRow = data
        break
      }
      // 23505 = unique violation; retry with a fresh code
      if ((error as { code?: string }).code !== '23505') {
        return serverError(error.message)
      }
    }
    if (!codeRow) return serverError('code_generation_failed')
  }

  const { data: summary } = await svc
    .from('referral_summary')
    .select('pending_count, converted_count, rewarded_count')
    .eq('referrer_user_id', userId)
    .maybeSingle()

  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
  return NextResponse.json({
    code: codeRow.code,
    shareUrl: `${origin}/signup?ref=${codeRow.code}`,
    summary: summary ?? { pending_count: 0, converted_count: 0, rewarded_count: 0 },
  })
}
