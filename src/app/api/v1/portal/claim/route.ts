import { NextRequest, NextResponse } from 'next/server'
import { requireClient, badRequest, serverError } from '../../../../../lib/server-auth'

/**
 * POST /api/v1/portal/claim  Body: { token }
 * Binds the contractor-owned `clients` record referenced by a pending
 * invite token to the authenticated portal account (proof of possession —
 * the contractor sent this token to the client).
 */
export async function POST(req: NextRequest) {
  const auth = await requireClient(req)
  if ('error' in auth) return auth.error
  const { user, supabase } = auth

  const body = await req.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  if (!token) return badRequest('Missing invite token')

  const { data: invite } = await supabase
    .from('client_portal_invites')
    .select('id, client_id, contractor_id, status')
    .eq('token', token)
    .maybeSingle()
  if (!invite || invite.status === 'revoked') {
    return badRequest('This invite link is invalid or has been revoked.')
  }

  const { error: linkErr } = await supabase
    .from('client_links')
    .upsert(
      { portal_user_id: user.id, client_id: invite.client_id, contractor_id: invite.contractor_id },
      { onConflict: 'portal_user_id,client_id' }
    )
  if (linkErr) return serverError('Could not link your account', linkErr.message)

  if (invite.status !== 'accepted') {
    await supabase
      .from('client_portal_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id)
  }

  return NextResponse.json({ data: { linked: true } })
}
