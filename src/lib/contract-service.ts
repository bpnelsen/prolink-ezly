/**
 * Server-side helpers shared by every contract API route:
 *  - load contract + relations
 *  - resolve the active template for a contractor/state
 *  - render HTML and stash a contract_versions row
 *  - upload PDF buffer (no-op while no server-side PDF library is wired)
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { renderContractHTML, renderContractPDF, ContractRenderInput } from './contract-renderer'
import { serviceClient } from './server-auth'

export const STORAGE_BUCKET = 'contract-documents'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export async function getActiveTemplate(
  supabase: SupabaseClient,
  jurisdictionState: string | null
): Promise<Row | null> {
  const today = new Date().toISOString().slice(0, 10)
  const queryFor = async (state: string | null) => {
    let q = supabase
      .from('contract_templates')
      .select('*')
      .eq('template_type', 'owner_contractor')
      .lte('effective_date', today)
      .or(`retired_date.is.null,retired_date.gt.${today}`)
      .order('version', { ascending: false })
      .limit(1)
    q = state ? q.eq('jurisdiction_state', state) : q.is('jurisdiction_state', null)
    const { data } = await q
    return data?.[0] || null
  }
  if (jurisdictionState) {
    const match = await queryFor(jurisdictionState)
    if (match) return match
  }
  return queryFor(null)
}

export async function loadContractContext(
  supabase: SupabaseClient,
  contractId: string
): Promise<ContractRenderInput | null> {
  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .single()
  if (!contract) return null

  const [
    { data: template },
    { data: job },
    { data: client },
    { data: contractor },
    { data: profile },
    { data: signatures },
  ] = await Promise.all([
    supabase.from('contract_templates').select('*').eq('id', contract.template_id).single(),
    supabase.from('jobs').select('*').eq('id', contract.job_id).single(),
    contract.client_id
      ? supabase.from('clients').select('*').eq('id', contract.client_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('customers').select('*').eq('id', contract.contractor_id).single(),
    supabase.from('profiles').select('full_name, email').eq('id', contract.contractor_id).single(),
    supabase.from('contract_signatures').select('*').eq('contract_id', contractId),
  ])

  let milestones: ContractRenderInput['milestones'] = []
  const { data: ms } = await supabase
    .from('job_milestones')
    .select('description, amount, due_date')
    .eq('job_id', contract.job_id)
    .order('due_date', { ascending: true })
  if (ms) milestones = ms

  const contractorRow = { ...(contractor || {}), ...(profile || {}) }
  return {
    contract,
    template: template ? { id: template.id, content: template.content } : { id: '', content: { title: 'Contract' } },
    job: job || null,
    client: client || null,
    contractor: contractorRow,
    contractorLicense: contractor
      ? { number: contractor.license_number, expiration: contractor.license_expiration }
      : null,
    contractorInsurance: contractor
      ? {
          provider: contractor.insurance_provider,
          policy_number: contractor.insurance_policy_number,
          expiration: contractor.insurance_expiration,
        }
      : null,
    milestones,
    signatures: (signatures || []).map(s => ({
      signer_role: s.signer_role,
      signer_name: s.signer_name,
      signed_at: s.signed_at,
      signature_image_url: s.signature_image_url,
    })),
  }
}

/**
 * Render + persist a new contract_versions row. Uploads the HTML rendition
 * to storage; the PDF buffer path is wired but currently returns null
 * (browser-print is the active path).
 */
export async function renderAndStoreVersion(
  contractId: string,
  reason: 'initial' | 'edit' | 'change_order',
  changeOrderId: string | null = null
): Promise<{ version_number: number; pdf_url: string | null }> {
  const svc = serviceClient()
  const ctx = await loadContractContext(svc, contractId)
  if (!ctx) throw new Error(`Contract ${contractId} not found`)

  const html = renderContractHTML(ctx)
  const pdfBuffer = await renderContractPDF(ctx) // null until a PDF library is added

  // Bump version
  const { data: existing } = await svc
    .from('contract_versions')
    .select('version_number')
    .eq('contract_id', contractId)
    .order('version_number', { ascending: false })
    .limit(1)
  const versionNumber = (existing?.[0]?.version_number || 0) + 1

  // Upload (HTML always; PDF if/when we have a buffer)
  const htmlPath = `${contractId}/v${versionNumber}.html`
  await svc.storage.from(STORAGE_BUCKET).upload(htmlPath, new Blob([html], { type: 'text/html' }), {
    upsert: true,
    contentType: 'text/html',
  })
  let pdfUrl: string | null = null
  if (pdfBuffer) {
    const pdfPath = `${contractId}/v${versionNumber}.pdf`
    await svc.storage.from(STORAGE_BUCKET).upload(pdfPath, pdfBuffer, {
      upsert: true,
      contentType: 'application/pdf',
    })
    pdfUrl = svc.storage.from(STORAGE_BUCKET).getPublicUrl(pdfPath).data.publicUrl
  } else {
    pdfUrl = svc.storage.from(STORAGE_BUCKET).getPublicUrl(htmlPath).data.publicUrl
  }

  await svc.from('contract_versions').insert({
    contract_id: contractId,
    version_number: versionNumber,
    reason,
    change_order_id: changeOrderId,
    pdf_url: pdfUrl,
    snapshot: { contract: ctx.contract, template_id: ctx.template.id },
  })

  await svc
    .from('contracts')
    .update({ current_version: versionNumber, updated_at: new Date().toISOString() })
    .eq('id', contractId)

  return { version_number: versionNumber, pdf_url: pdfUrl }
}
