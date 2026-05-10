import { NextRequest, NextResponse } from 'next/server'
import { requireUser, badRequest, notFound, forbidden, serverError } from '../../../../../lib/server-auth'

const EDITABLE_FIELDS = ['description', 'amount_delta', 'time_delta_days']

/** PATCH /api/v1/change-orders/:coId — update draft */
export async function PATCH(req: NextRequest, { params }: { params: { coId: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const body = await req.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON body')

  const { data: co } = await supabase
    .from('change_orders').select('*, contracts(contract_sum, substantial_completion_date)').eq('id', params.coId).single()
  if (!co) return notFound('Change order not found')
  if (co.status !== 'draft') return forbidden('Only draft change orders can be edited.')

  const update: Record<string, unknown> = {}
  for (const k of EDITABLE_FIELDS) if (k in body) update[k] = body[k]

  // Recompute totals
  const contractObj = (co as { contracts?: { contract_sum: number; substantial_completion_date: string | null } }).contracts
  const baseSum = Number(contractObj?.contract_sum || 0)
  const baseDate = contractObj?.substantial_completion_date || null
  const newAmount = Number(update.amount_delta ?? co.amount_delta ?? 0)
  const newDays = Number(update.time_delta_days ?? co.time_delta_days ?? 0)
  update.new_contract_sum = baseSum + newAmount
  if (baseDate) {
    const d = new Date(baseDate)
    d.setUTCDate(d.getUTCDate() + newDays)
    update.new_completion_date = d.toISOString().slice(0, 10)
  }

  const { data, error } = await supabase.from('change_orders').update(update).eq('id', params.coId).select('*').single()
  if (error) return serverError('Failed to update change order', error.message)
  return NextResponse.json({ data })
}
