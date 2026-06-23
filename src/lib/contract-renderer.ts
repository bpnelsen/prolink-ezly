/**
 * Contract renderer.
 *
 * Mirrors the invoice module's approach: produce HTML that the browser
 * prints to PDF. A `renderContractPDF` server-side Buffer path is exposed
 * with the same shape but stubbed behind a feature flag — see SignWell
 * service for the matching pattern.
 */

export type RawTemplateContent = {
  title: string
  intro?: string
  parties?: {
    owner?: { heading: string; lines: string[] }
    contractor?: { heading: string; lines: string[] }
  }
  project?: { heading: string; lines: string[] }
  articles?: Array<{ n: number; heading: string; body: string }>
  exhibit_a?: { heading: string; source: 'milestones' | string }
  signatures?: Array<{ role: 'owner' | 'contractor'; label: string }>
}

export interface ContractRenderInput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contract: Record<string, any>
  template: { id: string; content: RawTemplateContent }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  job: Record<string, any> | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: Record<string, any> | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contractor: Record<string, any> | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contractorLicense: Record<string, any> | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contractorInsurance: Record<string, any> | null
  milestones: Array<{ description: string; amount: number; due_date?: string | null }>
  signatures?: Array<{
    signer_role: 'owner' | 'contractor'
    signer_name: string
    signed_at: string | null
    signature_image_url: string | null
  }>
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
}

function applyFilter(value: unknown, filter: string): string {
  if (value === null || value === undefined || value === '') return ''
  switch (filter) {
    case 'currency': {
      const n = Number(value)
      if (Number.isNaN(n)) return String(value)
      return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    }
    case 'percent': {
      const n = Number(value)
      if (Number.isNaN(n)) return String(value)
      const pct = n * 100
      const rounded = Math.round(pct * 10) / 10
      return Number.isInteger(rounded) ? `${rounded.toFixed(0)}%` : `${rounded}%`
    }
    case 'date': {
      const d = new Date(String(value))
      if (Number.isNaN(d.getTime())) return String(value)
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }
    case 'state_name': {
      const s = String(value).toUpperCase()
      return STATE_NAMES[s] || String(value)
    }
    case 'humanize': {
      const KNOWN: Record<string, string> = {
        mediation_then_arbitration: 'Mediation, then Binding Arbitration',
        arbitration: 'Binding Arbitration',
        litigation: 'Litigation in a court of competent jurisdiction',
      }
      const raw = String(value)
      if (KNOWN[raw]) return KNOWN[raw]
      return raw.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }
    case 'int': {
      const n = Number(value)
      if (Number.isNaN(n)) return String(value)
      return String(Math.trunc(n))
    }
    default:
      return String(value)
  }
}

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

function substitute(template: string, scope: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, expr: string) => {
    const parts = expr.split('|').map(s => s.trim())
    const path = parts[0]
    const filters = parts.slice(1)
    let value: unknown = path === 'sig' ? '' : getPath(scope, path)
    for (const f of filters) value = applyFilter(value, f)
    if (value === undefined || value === null) return ''
    return escapeHtml(String(value))
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ---------------------------------------------------------------------------
// Computed namespace
// ---------------------------------------------------------------------------
function buildComputed(input: ContractRenderInput) {
  const c = input.contract || {}
  const client = input.client || {}
  const contractor = input.contractor || {}
  const job = input.job || {}

  const depositAmount = Number(c.contract_sum || 0) * Number(c.deposit_pct || 0)
  const ownerFullName = [client.first_name, client.last_name].filter(Boolean).join(' ').trim()

  const contractorAddressFull = [
    contractor.street_address,
    [contractor.city, contractor.state].filter(Boolean).join(', '),
    contractor.zip_code,
  ].filter(Boolean).join(', ')

  const projectAddressFull =
    job.site_address ||
    [client.street_address, [client.city, client.state].filter(Boolean).join(', '), client.zip_code]
      .filter(Boolean)
      .join(', ')

  return {
    deposit_amount: depositAmount,
    owner_full_name: ownerFullName,
    contractor_address_full: contractorAddressFull,
    project_address_full: projectAddressFull,
  }
}

// ---------------------------------------------------------------------------
// HTML rendering
// ---------------------------------------------------------------------------
const TEAL = '#0F766E'
const PURPLE = '#6D28D9'

export function renderContractHTML(input: ContractRenderInput): string {
  const computed = buildComputed(input)
  const scope: Record<string, unknown> = {
    contract: input.contract,
    template: input.template,
    job: input.job,
    client: input.client,
    contractor: input.contractor,
    contractorLicense: input.contractorLicense,
    contractorInsurance: input.contractorInsurance,
    computed,
  }
  const content = input.template.content
  type Sig = NonNullable<ContractRenderInput['signatures']>[number]
  const sigBySigner = new Map<string, Sig>()
  ;(input.signatures || []).forEach(s => sigBySigner.set(s.signer_role, s))

  const partyBlock = (party?: { heading: string; lines: string[] }) => {
    if (!party) return ''
    const lines = party.lines.map(l => substitute(l, scope)).filter(l => l.trim().length > 0)
    return `
      <div class="party">
        <p class="party-h">${escapeHtml(party.heading)}</p>
        ${lines.map(l => `<p class="party-l">${l}</p>`).join('')}
      </div>`
  }

  const articleBlock = (a: { n: number; heading: string; body: string }) => `
    <section class="art">
      <h3 class="art-h">Article ${a.n}. ${escapeHtml(a.heading)}</h3>
      <p class="art-b">${substitute(a.body, scope)}</p>
    </section>`

  const exhibitA = () => {
    if (!content.exhibit_a) return ''
    const rows = (input.milestones || []).map((m, i) => `
      <tr class="${i % 2 === 0 ? 'r-a' : 'r-b'}">
        <td class="ex-td">${escapeHtml(m.description || '')}</td>
        <td class="ex-td ex-right">${m.due_date ? applyFilter(m.due_date, 'date') : '—'}</td>
        <td class="ex-td ex-right">${applyFilter(m.amount, 'currency')}</td>
      </tr>`).join('')
    const total = (input.milestones || []).reduce((s, m) => s + Number(m.amount || 0), 0)
    return `
      <section class="art">
        <h3 class="art-h">${escapeHtml(content.exhibit_a.heading)}</h3>
        <table class="ex-tbl">
          <thead>
            <tr><th class="ex-th">Milestone</th><th class="ex-th ex-right">Due</th><th class="ex-th ex-right">Amount</th></tr>
          </thead>
          <tbody>
            ${rows || `<tr><td class="ex-td" colspan="3"><em>No milestones defined.</em></td></tr>`}
          </tbody>
          <tfoot>
            <tr><td class="ex-td ex-foot" colspan="2">Total</td><td class="ex-td ex-foot ex-right">${applyFilter(total, 'currency')}</td></tr>
          </tfoot>
        </table>
      </section>`
  }

  const signatureBlock = () => {
    const sigs = content.signatures || []
    return `
      <section class="sigs">
        ${sigs.map(s => {
          const rec = sigBySigner.get(s.role)
          const signed = rec && rec.signed_at
          const name = rec?.signer_name || ''
          return `
            <div class="sig-box">
              <p class="sig-label">${escapeHtml(s.label)}</p>
              ${signed
                ? `<div class="sig-line sig-signed">${rec?.signature_image_url
                      ? `<img src="${escapeHtml(rec.signature_image_url)}" alt="signature" />`
                      : `<span class="sig-typed">${escapeHtml(name)}</span>`}
                    </div>
                    <p class="sig-meta">${escapeHtml(name)} · ${applyFilter(rec!.signed_at, 'date')}</p>`
                : `<div class="sig-line">
                    <span class="signwell-tag" data-role="${escapeHtml(s.role)}">{{sig}}</span>
                  </div>
                  <p class="sig-meta">Awaiting signature</p>`}
            </div>`
        }).join('')}
      </section>`
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(content.title)} · ${escapeHtml(input.contract.contract_number || '')}</title>
<style>
  :root { --teal: ${TEAL}; --purple: ${PURPLE}; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1f2937; background: #fff; font-size: 12pt; line-height: 1.45; }
  .doc { max-width: 8.5in; margin: 0 auto; padding: 0.6in 0.7in; }
  .title { color: var(--teal); font-size: 22pt; font-weight: 700; margin: 0 0 4px 0; }
  .sub { color: #6b7280; font-size: 10pt; margin: 0 0 24px 0; letter-spacing: 0.04em; text-transform: uppercase; }
  .intro { margin: 0 0 18px 0; }
  .parties { display: flex; gap: 24px; margin: 0 0 18px 0; }
  .party { flex: 1; border-left: 3px solid var(--purple); padding: 4px 0 4px 12px; }
  .party-h { margin: 0 0 6px 0; font-weight: 700; color: var(--purple); text-transform: uppercase; font-size: 9pt; letter-spacing: 0.06em; }
  .party-l { margin: 0; font-size: 10.5pt; }
  .project { background: #f9fafb; padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 6px; margin: 0 0 18px 0; }
  .project-h { margin: 0 0 6px 0; font-weight: 700; color: var(--teal); font-size: 10pt; text-transform: uppercase; letter-spacing: 0.06em; }
  .project-l { margin: 0; font-size: 10.5pt; }
  .art { margin: 14px 0; page-break-inside: avoid; }
  .art-h { margin: 0 0 4px 0; color: var(--teal); font-size: 12.5pt; }
  .art-b { margin: 0; text-align: justify; }
  .ex-tbl { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10.5pt; }
  .ex-th { background: var(--teal); color: #fff; padding: 6px 8px; text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.05em; }
  .ex-td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
  .ex-right { text-align: right; }
  .ex-foot { font-weight: 700; border-top: 2px solid #d1d5db; }
  .r-a { background: #fff; }
  .r-b { background: #f9fafb; }
  .sigs { margin-top: 36px; display: flex; gap: 32px; page-break-inside: avoid; }
  .sig-box { flex: 1; }
  .sig-label { margin: 0 0 6px 0; font-weight: 700; color: var(--purple); font-size: 9pt; text-transform: uppercase; letter-spacing: 0.06em; }
  .sig-line { border-bottom: 1px solid #1f2937; height: 48px; display: flex; align-items: flex-end; padding: 0 4px 4px; }
  .sig-signed { border-bottom-color: var(--teal); }
  .sig-signed img { max-height: 44px; }
  .sig-typed { font-family: 'Brush Script MT', cursive; font-size: 22pt; color: var(--teal); }
  .sig-meta { margin: 4px 0 0 0; font-size: 9pt; color: #6b7280; }
  .signwell-tag { color: #9ca3af; font-size: 9pt; }
  @media print { body { font-size: 11pt; } .doc { padding: 0.5in 0.5in; } }
</style>
</head>
<body>
<div class="doc">
  <h1 class="title">${escapeHtml(content.title)}</h1>
  <p class="sub">${escapeHtml(input.contract.contract_number || '')}${input.contract.start_date ? ' · ' + applyFilter(input.contract.start_date, 'date') : ''}</p>

  ${content.intro ? `<p class="intro">${substitute(content.intro, scope)}</p>` : ''}

  <div class="parties">
    ${partyBlock(content.parties?.owner)}
    ${partyBlock(content.parties?.contractor)}
  </div>

  ${content.project ? `
    <div class="project">
      <p class="project-h">${escapeHtml(content.project.heading)}</p>
      ${content.project.lines.map(l => `<p class="project-l">${substitute(l, scope)}</p>`).join('')}
    </div>` : ''}

  ${(content.articles || []).map(articleBlock).join('')}

  ${exhibitA()}

  ${signatureBlock()}
</div>
</body>
</html>`
}

/**
 * Server-side PDF rendering.
 *
 * Stubbed: this project currently relies on browser print (matching the
 * invoice module). When a PDF rendering library is introduced, fill in
 * the body here — every call site already awaits it correctly.
 */
export async function renderContractPDF(_input: ContractRenderInput): Promise<Buffer | null> {
  return null
}

// Test-only exports
export const __test = { applyFilter, substitute, buildComputed }
