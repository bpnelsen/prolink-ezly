import { NextRequest, NextResponse } from 'next/server'
import { requireClient, notFound } from '../../../../../../lib/server-auth'

/** GET /api/v1/portal/contracts/:id — one of the caller's contracts + versions. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireClient(req)
  if ('error' in auth) return auth.error
  const { supabase, clientIds } = auth

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, client_id, contractor_id, contract_number, status, contract_sum, created_at')
    .eq('id', params.id)
    .maybeSingle()
  if (!contract || !contract.client_id || !clientIds.includes(contract.client_id)) {
    return notFound('Contract not found')
  }

  const [{ data: versions }, { data: biz }] = await Promise.all([
    supabase
      .from('contract_versions')
      .select('version_number, reason, pdf_url, signed_pdf_url, created_at')
      .eq('contract_id', contract.id)
      .order('version_number', { ascending: false }),
    supabase.from('customers').select('business_name').eq('id', contract.contractor_id).maybeSingle(),
  ])

  return NextResponse.json({
    data: { contract, versions: versions || [], business: biz || {} },
  })
}
