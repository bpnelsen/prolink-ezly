import { NextRequest, NextResponse } from 'next/server'
import { requireUser, badRequest, notFound, serverError } from '../../../../../../lib/server-auth'
import { getActiveTemplate, renderAndStoreVersion } from '../../../../../../lib/contract-service'

/**
 * POST /api/v1/jobs/:jobId/contract
 * Body: { contract_sum, start_date, substantial_completion_date, governing_law_state,
 *         deposit_pct?, retainage_pct?, application_due_day?, payment_due_days?,
 *         late_interest_rate_annual?, dispute_method? }
 */
export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { user, supabase } = auth

  const body = await req.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON body')

  const required = ['contract_sum', 'start_date', 'substantial_completion_date', 'governing_law_state']
  const missing = required.filter(k => body[k] === undefined || body[k] === null || body[k] === '')
  if (missing.length) return badRequest(`Missing required fields: ${missing.join(', ')}`)

  // Make sure the job exists and belongs to the caller (RLS enforces this anyway)
  const { data: job } = await supabase.from('jobs').select('*').eq('id', params.jobId).single()
  if (!job) return notFound('Job not found')

  const templateResult = await getActiveTemplate(supabase, body.governing_law_state || null)
  if ('error' in templateResult) return serverError(templateResult.error, templateResult.details)
  const template = templateResult.template

  // Generate contract number (PL-YYYY-NNNN)
  const { data: numData, error: numErr } = await supabase.rpc('next_contract_number', { c_id: user.id })
  if (numErr || !numData) return serverError('Could not generate contract number', numErr?.message)

  const insertRow = {
    contractor_id: user.id,
    job_id: params.jobId,
    client_id: job.client_id || null,
    template_id: template.id,
    contract_number: numData as string,
    status: 'draft',
    contract_sum: Number(body.contract_sum),
    deposit_pct: body.deposit_pct ?? 0.10,
    retainage_pct: body.retainage_pct ?? 0.10,
    application_due_day: body.application_due_day ?? 25,
    payment_due_days: body.payment_due_days ?? 10,
    late_interest_rate_annual: body.late_interest_rate_annual ?? 0.08,
    dispute_method: body.dispute_method || 'mediation_then_arbitration',
    governing_law_state: body.governing_law_state,
    start_date: body.start_date,
    substantial_completion_date: body.substantial_completion_date,
  }

  const { data: contract, error: insErr } = await supabase
    .from('contracts')
    .insert(insertRow)
    .select('*')
    .single()
  if (insErr || !contract) return serverError('Failed to create contract', insErr?.message)

  try {
    await renderAndStoreVersion(contract.id, 'initial')
  } catch (e) {
    return serverError('Failed to render initial contract version', String(e))
  }

  const { data: refreshed } = await supabase.from('contracts').select('*').eq('id', contract.id).single()
  return NextResponse.json({ data: refreshed }, { status: 201 })
}
