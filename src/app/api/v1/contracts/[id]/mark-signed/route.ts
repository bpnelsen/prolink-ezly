import { NextRequest, NextResponse } from 'next/server'
import { requireUser, badRequest, notFound, serverError } from '../../../../../../lib/server-auth'

/**
 * POST /api/v1/contracts/:id/mark-signed
 * Body: { signer_role: 'owner' | 'contractor', signed_at?: ISO }
 * Records a wet-ink signature. If both signers are marked, auto-transitions
 * the contract to 'executed'. Otherwise sets status to 'partially_signed'.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const body = await req.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON body')
  const role = body.signer_role
  if (role !== 'owner' && role !== 'contractor') return badRequest('signer_role must be "owner" or "contractor"')

  const signedAt = body.signed_at || new Date().toISOString()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const ua = req.headers.get('user-agent') || null

  const { data: contract } = await supabase
    .from('contracts').select('id, status').eq('id', params.id).single()
  if (!contract) return notFound('Contract not found')

  const { data: sigRow } = await supabase
    .from('contract_signatures')
    .select('id')
    .eq('contract_id', params.id)
    .eq('signer_role', role)
    .single()
  if (!sigRow) return notFound(`No ${role} signature row for this contract`)

  const { error: sigErr } = await supabase
    .from('contract_signatures')
    .update({ signed_at: signedAt, ip_address: ip, user_agent: ua })
    .eq('id', sigRow.id)
  if (sigErr) return serverError('Failed to record signature', sigErr.message)

  // Check both signers
  const { data: allSigs } = await supabase
    .from('contract_signatures')
    .select('signer_role, signed_at')
    .eq('contract_id', params.id)

  const allSigned = (allSigs || []).length >= 2 && (allSigs || []).every(s => s.signed_at)
  const newStatus = allSigned ? 'executed' : 'partially_signed'
  const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() }
  if (allSigned) updates.executed_at = new Date().toISOString()

  const { data: updated, error: upErr } = await supabase
    .from('contracts').update(updates).eq('id', params.id).select('*').single()
  if (upErr) return serverError('Failed to update contract status', upErr.message)

  return NextResponse.json({ data: updated, all_signed: allSigned })
}
