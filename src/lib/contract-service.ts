/**
 * Server-side helpers shared by every contract API route:
 *  - load contract + relations
 *  - resolve the active template for a contractor/state
 *  - render HTML and stash a contract_versions row
 *  - upload PDF buffer (no-op while no server-side PDF library is wired)
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { renderContractHTML, renderContractPDF, ContractRenderInput } from './contract-renderer'
import { serviceClient, hasServiceRole } from './server-auth'

export const STORAGE_BUCKET = 'contract-documents'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

/** Discriminated result so callers can surface a precise, actionable reason. */
export type TemplateResult =
  | { template: Row }
  | { error: string; details?: string }

/**
 * Default v1 owner-contractor template content. Mirrors the seed in
 * migrations/010_contract_module.sql so a fresh database can produce
 * contracts even before the SQL seed has been re-run.
 */
const DEFAULT_OWNER_CONTRACTOR_TEMPLATE = {
  title: 'Owner-Contractor Construction Agreement',
  intro: 'This Agreement is made and entered into as of {{contract.start_date|date}} by and between {{computed.owner_full_name}} ("Owner") and {{contractor.business_name}} ("Contractor").',
  parties: {
    owner: {
      heading: 'Owner',
      lines: ['{{computed.owner_full_name}}', '{{client.street_address}}', '{{client.city}}, {{client.state|state_name}} {{client.zip_code}}', '{{client.phone}}', '{{client.email}}'],
    },
    contractor: {
      heading: 'Contractor',
      lines: ['{{contractor.business_name}}', '{{computed.contractor_address_full}}', 'License: {{contractorLicense.number}}', '{{contractor.phone}}'],
    },
  },
  project: {
    heading: 'Project',
    lines: ['Project Address: {{computed.project_address_full}}', 'Start Date: {{contract.start_date|date}}', 'Substantial Completion: {{contract.substantial_completion_date|date}}'],
  },
  articles: [
    { n: 1, heading: 'Scope of Work', body: 'Contractor shall furnish all labor, materials, equipment, and services necessary to complete the work described in the attached scope and any documents incorporated herein (collectively, the "Work").' },
    { n: 2, heading: 'Contract Sum', body: 'Owner shall pay Contractor a total contract sum of {{contract.contract_sum|currency}} for the full and faithful performance of the Work, subject to additions and deductions by Change Order as provided herein.' },
    { n: 3, heading: 'Payment Terms', body: 'A deposit of {{contract.deposit_pct|percent}} ({{computed.deposit_amount|currency}}) is due upon execution of this Agreement. Progress payments shall be made against applications submitted by the {{contract.application_due_day|int}} of each month and shall be due within {{contract.payment_due_days|int}} days. Retainage of {{contract.retainage_pct|percent}} shall be withheld from each progress payment and released upon substantial completion.' },
    { n: 4, heading: 'Late Payment', body: 'Any payment not made when due shall accrue interest at the rate of {{contract.late_interest_rate_annual|percent}} per annum until paid in full.' },
    { n: 5, heading: 'Change Orders', body: 'Any change to the scope, contract sum, or completion date shall be documented in a written Change Order signed by both parties before the changed Work is performed.' },
    { n: 6, heading: 'Insurance & Licensing', body: "Contractor warrants that it is duly licensed in the State of {{contract.governing_law_state|state_name}} and shall maintain general liability and workers' compensation insurance in commercially reasonable amounts throughout the term of the Work." },
    { n: 7, heading: 'Warranty', body: 'Contractor warrants that the Work shall be free from defects in workmanship for a period of one (1) year following substantial completion.' },
    { n: 8, heading: 'Dispute Resolution', body: 'Any dispute arising under this Agreement shall be resolved by {{contract.dispute_method|humanize}}. This Agreement shall be governed by the laws of the State of {{contract.governing_law_state|state_name}}.' },
    { n: 9, heading: 'Entire Agreement', body: 'This Agreement, together with all exhibits and incorporated documents, constitutes the entire agreement between the parties and supersedes any prior negotiations or representations.' },
  ],
  exhibit_a: { heading: 'Exhibit A — Payment Schedule', source: 'milestones' },
  signatures: [
    { role: 'owner', label: 'Owner' },
    { role: 'contractor', label: 'Contractor' },
  ],
}

async function lookupActiveTemplate(
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

export async function getActiveTemplate(
  supabase: SupabaseClient,
  jurisdictionState: string | null
): Promise<TemplateResult> {
  const existing = await lookupActiveTemplate(supabase, jurisdictionState)
  if (existing) return { template: existing }

  // No template row found (typical when the SQL seed in migration 010 hasn't
  // been run on this Supabase project). We auto-seed the default v1 national
  // template — but inserting into contract_templates requires the service-role
  // client (there is no INSERT RLS policy for ordinary users).
  if (!hasServiceRole()) {
    return {
      error:
        'No contract template is configured and the default cannot be created automatically. ' +
        'Add SUPABASE_SERVICE_ROLE_KEY to your environment (Vercel → Settings → Environment ' +
        'Variables) and redeploy, or run migrations/010_contract_module.sql on your Supabase project.',
    }
  }

  try {
    const svc = serviceClient()
    const today = new Date().toISOString().slice(0, 10)
    const { data: inserted, error } = await svc
      .from('contract_templates')
      .insert({
        template_type: 'owner_contractor',
        jurisdiction_state: null,
        version: 1,
        effective_date: today,
        content: DEFAULT_OWNER_CONTRACTOR_TEMPLATE,
      })
      .select('*')
      .single()
    if (error) {
      console.error('[contract-service] auto-seed template failed', error)
      return {
        error:
          'No contract template was found and the default could not be seeded. ' +
          'Run migrations/010_contract_module.sql on your Supabase project to create the contract tables.',
        details: error.message,
      }
    }
    return { template: inserted }
  } catch (err) {
    console.error('[contract-service] auto-seed template threw', err)
    return {
      error: 'Could not initialize the default contract template.',
      details: String(err),
    }
  }
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
  if (!hasServiceRole()) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured — it is required to render and store contract ' +
        'documents. Add it in Vercel → Settings → Environment Variables and redeploy.'
    )
  }
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
