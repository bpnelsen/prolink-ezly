import { NextRequest, NextResponse } from 'next/server'
import { requireUser, notFound, serverError } from '../../../../../../lib/server-auth'
import { renderAndStoreVersion } from '../../../../../../lib/contract-service'

/**
 * POST /api/v1/change-orders/:coId/mark-executed
 * Applies the CO totals to the parent contract, bumps version, and renders
 * a new contract_versions row tagged with the CO id.
 */
export async function POST(req: NextRequest, { params }: { params: { coId: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const { data: co } = await supabase.from('change_orders').select('*').eq('id', params.coId).single()
  if (!co) return notFound('Change order not found')

  // Update parent contract
  const updates: Record<string, unknown> = {
    contract_sum: co.new_contract_sum,
    updated_at: new Date().toISOString(),
  }
  if (co.new_completion_date) updates.substantial_completion_date = co.new_completion_date

  const { error: upErr } = await supabase.from('contracts').update(updates).eq('id', co.contract_id)
  if (upErr) return serverError('Failed to update parent contract', upErr.message)

  try {
    await renderAndStoreVersion(co.contract_id, 'change_order', co.id)
  } catch (e) {
    return serverError('Failed to render updated contract', String(e))
  }

  const { data, error } = await supabase
    .from('change_orders')
    .update({ status: 'executed', executed_at: new Date().toISOString() })
    .eq('id', co.id)
    .select('*')
    .single()
  if (error) return serverError('Failed to mark CO executed', error.message)
  return NextResponse.json({ data })
}
