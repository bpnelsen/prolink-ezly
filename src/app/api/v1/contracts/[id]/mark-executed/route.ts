import { NextRequest, NextResponse } from 'next/server'
import { requireUser, notFound, forbidden, serverError } from '../../../../../../lib/server-auth'

/**
 * POST /api/v1/contracts/:id/mark-executed
 * Body: { force?: boolean } — admin override skips the all-signed check.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const body = await req.json().catch(() => ({}))
  const force = body?.force === true

  const { data: contract } = await supabase
    .from('contracts').select('id, status').eq('id', params.id).single()
  if (!contract) return notFound('Contract not found')

  const { data: sigs } = await supabase
    .from('contract_signatures').select('signed_at').eq('contract_id', params.id)
  const allSigned = (sigs || []).length >= 2 && (sigs || []).every(s => s.signed_at)
  if (!allSigned && !force) {
    return forbidden('Both signers must be marked before execution. Use { force: true } to override.')
  }

  const { data: updated, error: upErr } = await supabase
    .from('contracts')
    .update({
      status: 'executed',
      executed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select('*')
    .single()
  if (upErr) return serverError('Failed to mark executed', upErr.message)

  return NextResponse.json({ data: updated })
}
