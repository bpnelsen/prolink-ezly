import { NextRequest, NextResponse } from 'next/server'
import { requireUser, badRequest, notFound, serverError } from '../../../../../../lib/server-auth'

/** GET /api/v1/contracts/:id/change-orders */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth
  const { data, error } = await supabase
    .from('change_orders')
    .select('*')
    .eq('contract_id', params.id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

/**
 * POST /api/v1/contracts/:id/change-orders
 * Body: { description, amount_delta?, time_delta_days? }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const body = await req.json().catch(() => null)
  if (!body?.description) return badRequest('description is required')

  const { data: contract } = await supabase
    .from('contracts').select('contract_sum, substantial_completion_date').eq('id', params.id).single()
  if (!contract) return notFound('Contract not found')

  const { data: numData, error: numErr } = await supabase.rpc('next_co_number', { ct_id: params.id })
  if (numErr || !numData) return serverError('Could not generate CO number', numErr?.message)

  const amountDelta = Number(body.amount_delta || 0)
  const daysDelta = Number(body.time_delta_days || 0)
  const newSum = Number(contract.contract_sum || 0) + amountDelta
  let newCompletion: string | null = contract.substantial_completion_date
  if (newCompletion && daysDelta) {
    const d = new Date(newCompletion)
    d.setUTCDate(d.getUTCDate() + daysDelta)
    newCompletion = d.toISOString().slice(0, 10)
  }

  const insert = {
    contract_id: params.id,
    co_number: numData as string,
    description: String(body.description),
    amount_delta: amountDelta,
    time_delta_days: daysDelta,
    new_contract_sum: newSum,
    new_completion_date: newCompletion,
    status: 'draft' as const,
  }

  const { data, error } = await supabase.from('change_orders').insert(insert).select('*').single()
  if (error) return serverError('Failed to create change order', error.message)
  return NextResponse.json({ data }, { status: 201 })
}
