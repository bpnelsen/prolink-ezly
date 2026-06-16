import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Foreman action tools.
//
// Foreman is a chat assistant with a small set of WRITE actions (draft quotes,
// new customers, new jobs). Nothing here writes until the contractor approves
// in the UI: the POST /api/foreman route turns a model tool-call into a
// `Proposal`, the widget renders an Approve/Cancel card, and only on approve
// does POST /api/foreman/action call executeAction(). Every write is scoped to
// the authenticated contractor via the RLS-bound Supabase client.
// ---------------------------------------------------------------------------

// OpenAI-compatible function definitions sent to OpenRouter.
export const FOREMAN_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_quote',
      description:
        'Draft a price quote for a customer, saved as a DRAFT invoice. Call this when the contractor asks to add/create/save/send a quote or estimate to a customer or job. Always include every line item with quantity and dollar rate. This does NOT finalize anything — the contractor must approve it.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Full name of the customer, e.g. "Mike Jones".' },
          job_title: { type: 'string', description: 'Optional short job title, e.g. "Toilet Replacement".' },
          line_items: {
            type: 'array',
            description: 'The priced line items for the quote.',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                qty: { type: 'number' },
                unit: { type: 'string', description: 'Unit of measure: ea, hr, sqft, lft, day, lot.' },
                rate: { type: 'number', description: 'Price per unit in dollars.' },
              },
              required: ['description', 'qty', 'rate'],
            },
          },
          tax_rate: { type: 'number', description: 'Optional tax rate as a percent, e.g. 8.25.' },
          notes: { type: 'string', description: 'Optional notes for the customer.' },
        },
        required: ['customer_name', 'line_items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_customer',
      description:
        'Create a new customer (client) record. Call this when the contractor asks to add a new customer to their list.',
      parameters: {
        type: 'object',
        properties: {
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          address: { type: 'string' },
        },
        required: ['first_name', 'last_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_job',
      description:
        'Create a new job for an existing customer. Call this when the contractor asks to add/open a new job for a customer.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Full name of the existing customer the job is for.' },
          title: { type: 'string', description: 'Short job title, e.g. "Water Heater Install".' },
          description: { type: 'string' },
        },
        required: ['customer_name', 'title'],
      },
    },
  },
] as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type LineItem = { description: string; qty: number; unit: string; rate: number; amount: number }

export type Proposal =
  | {
      type: 'create_quote'
      summary: string
      client_id: string | null
      new_client: { first_name: string; last_name: string } | null
      client_name: string
      job_id: string | null
      new_job: { title: string } | null
      job_title: string | null
      line_items: LineItem[]
      subtotal: number
      tax_rate: number
      tax_amount: number
      total: number
      notes: string | null
    }
  | {
      type: 'create_customer'
      summary: string
      first_name: string
      last_name: string
      phone: string | null
      email: string | null
      address: string | null
    }
  | {
      type: 'create_job'
      summary: string
      client_id: string
      client_name: string
      title: string
      description: string | null
    }

type ClientRow = { id: string; first_name: string; last_name: string; email: string | null; phone: string | null }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
const UNITS = new Set(['ea', 'hr', 'sqft', 'lft', 'day', 'lot'])

export function splitName(name: string): { first_name: string; last_name: string } {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first_name: 'New', last_name: 'Customer' }
  if (parts.length === 1) return { first_name: parts[0], last_name: '' }
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') }
}

export function normalizeLineItems(raw: unknown): LineItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((r) => {
      const description = String((r as any)?.description ?? '').trim().slice(0, 500)
      const qty = Number((r as any)?.qty)
      const rate = Number((r as any)?.rate)
      const unitRaw = String((r as any)?.unit ?? 'ea').toLowerCase().trim()
      const unit = UNITS.has(unitRaw) ? unitRaw : 'ea'
      if (!description || !Number.isFinite(qty) || !Number.isFinite(rate)) return null
      return { description, qty, unit, rate, amount: round2(qty * rate) }
    })
    .filter((x): x is LineItem => x !== null)
    .slice(0, 100)
}

export function computeTotals(items: LineItem[], taxRateRaw: unknown) {
  const tax_rate = Number.isFinite(Number(taxRateRaw)) ? Math.max(0, Number(taxRateRaw)) : 0
  const subtotal = round2(items.reduce((s, i) => s + i.amount, 0))
  const tax_amount = round2((subtotal * tax_rate) / 100)
  const total = round2(subtotal + tax_amount)
  return { tax_rate, subtotal, tax_amount, total }
}

// Name-match against the contractor's own clients (RLS-scoped client).
export async function resolveCustomer(
  supabase: SupabaseClient,
  name: string,
): Promise<{ status: 'one'; client: ClientRow } | { status: 'none' } | { status: 'many'; clients: ClientRow[] }> {
  const target = String(name || '').trim().toLowerCase()
  const { data } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, phone')
    .neq('is_deleted', true)
  const rows = (data ?? []) as ClientRow[]
  const matches = rows.filter((c) => {
    const full = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim().toLowerCase()
    return full === target || (target.length >= 3 && full.includes(target))
  })
  if (matches.length === 1) return { status: 'one', client: matches[0] }
  if (matches.length > 1) return { status: 'many', clients: matches.slice(0, 6) }
  return { status: 'none' }
}

// ---------------------------------------------------------------------------
// Execute an approved action. Totals are ALWAYS recomputed server-side; any
// client_id is re-verified for ownership. Returns a human summary + link.
// ---------------------------------------------------------------------------
export type ActionResult = { ok: true; summary: string; link?: string } | { ok: false; error: string }

async function verifyOwnedClient(supabase: SupabaseClient, clientId: string): Promise<ClientRow | null> {
  const { data } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, phone')
    .eq('id', clientId)
    .maybeSingle()
  return (data as ClientRow) ?? null
}

export async function executeAction(
  supabase: SupabaseClient,
  userId: string,
  action: any,
): Promise<ActionResult> {
  const type = action?.type

  if (type === 'create_customer') {
    const { first_name, last_name } = splitNameFields(action)
    if (!first_name) return { ok: false, error: 'A first name is required.' }
    const { data, error } = await supabase
      .from('clients')
      .insert({
        contractor_id: userId,
        first_name,
        last_name: last_name || '',
        phone: action.phone || null,
        email: action.email || null,
        street_address: action.address || null,
      })
      .select('id')
      .single()
    if (error || !data) return { ok: false, error: 'Could not create the customer.' }
    return { ok: true, summary: `Added customer ${first_name} ${last_name}`.trim(), link: `/customers/${data.id}` }
  }

  if (type === 'create_job') {
    const clientId = await resolveClientIdForAction(supabase, userId, action)
    if (!clientId) return { ok: false, error: 'That customer was not found in your list.' }
    const title = String(action.title || '').trim()
    if (!title) return { ok: false, error: 'A job title is required.' }
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        contractor_id: userId,
        client_id: clientId,
        title: title.slice(0, 200),
        description: action.description ? String(action.description).slice(0, 2000) : null,
        status: 'pending',
      })
      .select('id')
      .single()
    if (error || !data) return { ok: false, error: 'Could not create the job.' }
    return { ok: true, summary: `Created job "${title}"`, link: `/dashboard/jobs/${data.id}` }
  }

  if (type === 'create_quote') {
    // Resolve / create the client.
    let clientId: string | null = action.client_id ?? null
    let clientName = action.client_name ?? ''
    if (clientId) {
      const owned = await verifyOwnedClient(supabase, clientId)
      if (!owned) return { ok: false, error: 'That customer was not found in your list.' }
      clientName = `${owned.first_name} ${owned.last_name}`.trim()
    } else if (action.new_client?.first_name) {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          contractor_id: userId,
          first_name: String(action.new_client.first_name).slice(0, 100),
          last_name: String(action.new_client.last_name || '').slice(0, 100),
        })
        .select('id, first_name, last_name')
        .single()
      if (error || !data) return { ok: false, error: 'Could not create the customer for this quote.' }
      clientId = data.id
      clientName = `${data.first_name} ${data.last_name}`.trim()
    } else {
      return { ok: false, error: 'No customer specified for the quote.' }
    }

    // Optionally create a job to attach.
    let jobId: string | null = action.job_id ?? null
    if (!jobId && action.new_job?.title) {
      const { data: job } = await supabase
        .from('jobs')
        .insert({ contractor_id: userId, client_id: clientId, title: String(action.new_job.title).slice(0, 200), status: 'pending' })
        .select('id')
        .single()
      jobId = job?.id ?? null
    } else if (jobId) {
      const { data: ownedJob } = await supabase.from('jobs').select('id').eq('id', jobId).maybeSingle()
      if (!ownedJob) jobId = null // silently drop a job we can't verify rather than fail the quote
    }

    const items = normalizeLineItems(action.line_items)
    if (items.length === 0) return { ok: false, error: 'The quote has no valid line items.' }
    const { tax_rate, subtotal, tax_amount, total } = computeTotals(items, action.tax_rate)

    const { data: numData, error: numErr } = await supabase.rpc('next_invoice_number', { c_id: userId })
    if (numErr) return { ok: false, error: 'Could not generate an invoice number.' }

    const today = new Date()
    const due = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        contractor_id: userId,
        client_id: clientId,
        job_id: jobId,
        invoice_number: numData,
        status: 'draft',
        invoice_type: 'one_time',
        subtotal,
        tax_rate,
        tax_amount,
        total,
        balance_due: total,
        issue_date: today.toISOString().slice(0, 10),
        due_date: due.toISOString().slice(0, 10),
        notes: action.notes ? String(action.notes).slice(0, 2000) : null,
      })
      .select('id, invoice_number')
      .single()
    if (invErr || !invoice) return { ok: false, error: 'Could not save the draft quote.' }

    const { error: liErr } = await supabase.from('invoice_line_items').insert(
      items.map((i, idx) => ({
        invoice_id: invoice.id,
        description: i.description,
        qty: i.qty,
        unit: i.unit,
        rate: i.rate,
        amount: i.amount,
        position: idx,
      })),
    )
    if (liErr) return { ok: false, error: 'Saved the quote but could not add line items.' }

    return {
      ok: true,
      summary: `Draft quote ${invoice.invoice_number} for ${clientName} — $${total.toFixed(2)}`,
      link: `/dashboard/invoices/${invoice.id}`,
    }
  }

  return { ok: false, error: 'Unknown action.' }
}

function splitNameFields(action: any): { first_name: string; last_name: string } {
  if (action.first_name) return { first_name: String(action.first_name).trim(), last_name: String(action.last_name || '').trim() }
  return splitName(action.customer_name || '')
}

async function resolveClientIdForAction(supabase: SupabaseClient, _userId: string, action: any): Promise<string | null> {
  if (action.client_id) {
    const owned = await verifyOwnedClient(supabase, action.client_id)
    return owned ? owned.id : null
  }
  if (action.customer_name) {
    const res = await resolveCustomer(supabase, action.customer_name)
    if (res.status === 'one') return res.client.id
  }
  return null
}
