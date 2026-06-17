import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Jack action tools.
//
// Jack is a chat assistant with a set of tools. READ tools (get_schedule) run
// server-side and feed results back to the model. WRITE tools (create/update
// quotes, customers, jobs, scheduling) never write directly: the POST /api/jack
// route turns a write tool-call into a `Proposal`, the widget renders an
// Approve/Cancel card, and only on approve does POST /api/jack/action call
// executeAction(). Every read/write is scoped to the authenticated contractor
// via the RLS-bound Supabase client.
// ---------------------------------------------------------------------------

const LINE_ITEMS_SCHEMA = {
  type: 'array',
  description: 'The full set of priced line items (the complete desired result, not a diff).',
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
} as const

// OpenAI-compatible function definitions sent to OpenRouter.
export const JACK_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_schedule',
      description:
        'Look up the contractor\'s scheduled jobs in a date range. Call this to answer any question about the schedule/calendar (today, this week, upcoming, a specific customer). Read-only.',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'Range start as YYYY-MM-DD. Defaults to today.' },
          end_date: { type: 'string', description: 'Range end as YYYY-MM-DD. Defaults to 14 days out.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_quote',
      description:
        'Draft a NEW price quote for a customer, saved as a DRAFT invoice. Call this when the contractor asks to add/create/save a new quote or estimate. Always include every line item. The contractor must approve before it saves.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Full name of the customer, e.g. "Mike Jones".' },
          job_title: { type: 'string', description: 'Optional short job title, e.g. "Toilet Replacement".' },
          line_items: LINE_ITEMS_SCHEMA,
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
      name: 'update_quote',
      description:
        'Update an EXISTING draft quote for a customer. Call this when the contractor asks to change/edit/adjust/revise a quote. Provide the COMPLETE new line-item list (it replaces the old items, not a diff). The contractor must approve.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Full name of the customer the quote belongs to.' },
          invoice_number: { type: 'string', description: 'Optional quote/invoice number like "#0007" if the customer has more than one draft.' },
          line_items: LINE_ITEMS_SCHEMA,
          tax_rate: { type: 'number', description: 'Optional tax rate as a percent.' },
          notes: { type: 'string' },
        },
        required: ['customer_name', 'line_items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_customer',
      description: 'Create a new customer (client) record. Call this when the contractor asks to add a new customer.',
      parameters: {
        type: 'object',
        properties: {
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          address: { type: 'string', description: 'Street address.' },
          city: { type: 'string' },
          state: { type: 'string' },
          zip: { type: 'string' },
        },
        required: ['first_name', 'last_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_customer',
      description:
        'Update an existing customer\'s contact info. Call this when the contractor asks to change/fix/update a customer\'s phone, email, address, or name. Only include the fields that change.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Full name of the existing customer to update.' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          address: { type: 'string', description: 'Street address.' },
          city: { type: 'string' },
          state: { type: 'string' },
          zip: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['customer_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_job',
      description: 'Create a new job for an existing customer. Call this when the contractor asks to open a new job.',
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
  {
    type: 'function',
    function: {
      name: 'schedule_job',
      description:
        'Schedule or reschedule an existing job to a date/time. Call this when the contractor asks to schedule, book, move, or reschedule a job. The contractor must approve.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Full name of the customer the job is for.' },
          job_title: { type: 'string', description: 'Optional job title to disambiguate if the customer has multiple jobs.' },
          start: { type: 'string', description: 'Start as a full ISO 8601 timestamp, e.g. "2026-06-20T09:00:00Z". Resolve relative dates (today/tomorrow/next Tue) yourself using the current date provided.' },
          duration_hours: { type: 'number', description: 'Optional duration in hours (defaults to 2).' },
        },
        required: ['customer_name', 'start'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_material_prices',
      description:
        'Look up the contractor\'s OWN pricing for materials and labor — from their price book and their recent quotes. Call this BEFORE creating or updating a quote so line-item rates match how this contractor actually prices. Read-only.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Optional search term to filter by item name, e.g. "toilet" or "labor".' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_material',
      description:
        'Add an item to the contractor\'s price book (their standard price for a material or labor line). Call this when the contractor asks to save/add a material or set a standard price. The contractor must approve.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Item name, e.g. "Toilet (standard)" or "Plumbing labor".' },
          unit: { type: 'string', description: 'Unit of measure: ea, hr, sqft, lft, day, lot.' },
          unit_price: { type: 'number', description: 'Price the contractor charges per unit, in dollars.' },
          unit_cost: { type: 'number', description: 'Optional cost the contractor pays per unit.' },
          category: { type: 'string', description: 'Optional grouping like plumbing, electrical, labor.' },
        },
        required: ['name', 'unit_price'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'refill_price_book',
      description:
        'Populate (refill) the contractor\'s price book from their past quotes — adds items they\'ve quoted before but that aren\'t in the book yet, using their most recent rate. Call this when they ask to refill, rebuild, import, or seed the price book from history. The contractor must approve.',
      parameters: { type: 'object', properties: {} },
    },
  },
] as const

export const READ_TOOLS = new Set(['get_schedule', 'get_material_prices'])

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
      type: 'update_quote'
      summary: string
      invoice_id: string
      invoice_number: string
      client_name: string
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
      city: string | null
      state: string | null
      zip: string | null
    }
  | {
      type: 'update_customer'
      summary: string
      client_id: string
      client_name: string
      changes: Record<string, string>
    }
  | {
      type: 'create_job'
      summary: string
      client_id: string
      client_name: string
      title: string
      description: string | null
    }
  | {
      type: 'schedule_job'
      summary: string
      job_id: string
      job_title: string
      client_name: string
      scheduled_start: string
      scheduled_end: string
    }
  | {
      type: 'add_material'
      summary: string
      name: string
      unit: string
      unit_price: number
      unit_cost: number | null
      category: string | null
    }
  | { type: 'refill_price_book'; summary: string }

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

// Build the line-item rows. The table carries BOTH column conventions
// (qty/quantity, rate/unit_price, amount/total, position/sort_order) — the
// manual invoice form writes both, so we mirror it exactly.
function lineItemRows(invoiceId: string, items: LineItem[]) {
  return items.map((i, idx) => ({
    invoice_id: invoiceId,
    description: i.description,
    quantity: i.qty,
    qty: i.qty,
    unit: i.unit,
    unit_price: i.rate,
    rate: i.rate,
    total: i.amount,
    amount: i.amount,
    sort_order: idx,
    position: idx,
  }))
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
// READ tools — executed server-side; the JSON string is fed back to the model.
// ---------------------------------------------------------------------------
function parseDateOnly(v: unknown, fallback: Date): Date {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v.length === 10 ? `${v}T00:00:00Z` : v)
    if (!isNaN(d.getTime())) return d
  }
  return fallback
}

export async function executeReadTool(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  args: any,
): Promise<string> {
  if (name === 'get_schedule') {
    const now = new Date()
    const start = parseDateOnly(args?.start_date, now)
    const end = parseDateOnly(args?.end_date, new Date(now.getTime() + 14 * 864e5))
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, scheduled_start, scheduled_end, status, clients(first_name, last_name)')
      .not('scheduled_start', 'is', null)
      .gte('scheduled_start', start.toISOString())
      .lte('scheduled_start', end.toISOString())
      .order('scheduled_start')
    if (error) return JSON.stringify({ error: 'Could not read the schedule.' })
    const jobs = (data ?? []).map((j: any) => ({
      title: j.title,
      customer: j.clients ? `${j.clients.first_name ?? ''} ${j.clients.last_name ?? ''}`.trim() : null,
      start: j.scheduled_start,
      end: j.scheduled_end,
      status: j.status,
    }))
    return JSON.stringify({ range: { start: start.toISOString(), end: end.toISOString() }, count: jobs.length, jobs })
  }

  if (name === 'get_material_prices') {
    const q = typeof args?.query === 'string' ? args.query.trim().toLowerCase() : ''
    // Price book (RLS-scoped to the contractor).
    const { data: pb } = await supabase
      .from('materials')
      .select('name, unit, unit_price, unit_cost, category')
      .eq('is_active', true)
      .order('name')
      .limit(200)
    let book = (pb ?? []) as any[]
    if (q) book = book.filter((m) => `${m.name ?? ''} ${m.category ?? ''}`.toLowerCase().includes(q))

    // Recent quoted line items. invoice_line_items has a permissive read policy,
    // so scope explicitly to this contractor's invoices via an inner join.
    const { data: li } = await supabase
      .from('invoice_line_items')
      .select('description, unit, rate, invoices!inner(contractor_id)')
      .eq('invoices.contractor_id', userId)
      .order('id', { ascending: false })
      .limit(300)
    const seen = new Set<string>()
    const history: any[] = []
    for (const row of (li ?? []) as any[]) {
      const key = String(row.description ?? '').trim().toLowerCase()
      if (!key || seen.has(key)) continue
      if (q && !key.includes(q)) continue
      seen.add(key)
      history.push({ description: row.description, unit: row.unit, rate: row.rate })
      if (history.length >= 25) break
    }
    return JSON.stringify({ price_book: book.slice(0, 50), recent_quoted_items: history })
  }

  return JSON.stringify({ error: 'unknown tool' })
}

// Refill the price book from past quote line items. Dedupes by item name,
// keeps the MOST RECENT rate, and skips anything already in the book. With
// commit:false it only previews the candidates (used to show a count before
// the contractor approves). Scoped to the contractor's own invoices.
export async function refillPriceBook(
  supabase: SupabaseClient,
  userId: string,
  opts: { commit: boolean },
): Promise<{ candidates: { name: string; unit: string; unit_price: number }[]; added: number }> {
  const { data: existing } = await supabase.from('materials').select('name')
  const have = new Set((existing ?? []).map((m: any) => String(m.name ?? '').trim().toLowerCase()))

  const { data: li } = await supabase
    .from('invoice_line_items')
    .select('description, unit, rate, invoices!inner(contractor_id, created_at)')
    .eq('invoices.contractor_id', userId)
    .limit(3000)

  // Most recent first, so the first time we see an item name wins.
  const rows = ((li ?? []) as any[]).slice().sort(
    (a, b) => new Date(b.invoices?.created_at ?? 0).getTime() - new Date(a.invoices?.created_at ?? 0).getTime(),
  )

  const seen = new Set<string>()
  const candidates: { name: string; unit: string; unit_price: number }[] = []
  for (const r of rows) {
    const name = String(r.description ?? '').trim()
    const key = name.toLowerCase()
    const rate = Number(r.rate)
    if (!name || !Number.isFinite(rate) || rate <= 0) continue
    if (have.has(key) || seen.has(key)) continue
    seen.add(key)
    const unitRaw = String(r.unit ?? 'ea').toLowerCase().trim()
    candidates.push({ name: name.slice(0, 200), unit: UNITS.has(unitRaw) ? unitRaw : 'ea', unit_price: round2(rate) })
    if (candidates.length >= 200) break
  }

  let added = 0
  if (opts.commit && candidates.length > 0) {
    const { error } = await supabase
      .from('materials')
      .insert(candidates.map((c) => ({ contractor_id: userId, name: c.name, unit: c.unit, unit_price: c.unit_price })))
    if (!error) added = candidates.length
  }
  return { candidates, added }
}

// ---------------------------------------------------------------------------
// Execute an approved WRITE action. Totals are ALWAYS recomputed server-side;
// any referenced record is re-verified for ownership. Returns a summary + link.
// ---------------------------------------------------------------------------
export type ActionResult = { ok: true; summary: string; link?: string } | { ok: false; error: string }

async function ownedClient(supabase: SupabaseClient, clientId: string): Promise<ClientRow | null> {
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
    const first = String(action.first_name || '').trim() || splitName(action.customer_name || '').first_name
    const last = String(action.last_name ?? splitName(action.customer_name || '').last_name).trim()
    if (!first) return { ok: false, error: 'A first name is required.' }
    const { data, error } = await supabase
      .from('clients')
      .insert({
        contractor_id: userId,
        first_name: first,
        last_name: last || '',
        phone: action.phone || null,
        email: action.email || null,
        address_line1: action.address || null,
        city: action.city || null,
        state: action.state || null,
        zip_code: action.zip || null,
      })
      .select('id')
      .single()
    if (error || !data) return { ok: false, error: 'Could not create the customer.' }
    return { ok: true, summary: `Added customer ${first} ${last}`.trim(), link: `/customers/${data.id}` }
  }

  if (type === 'update_customer') {
    if (!action.client_id) return { ok: false, error: 'No customer specified.' }
    const owned = await ownedClient(supabase, action.client_id)
    if (!owned) return { ok: false, error: 'That customer was not found in your list.' }
    const changes = (action.changes ?? {}) as Record<string, string>
    if (Object.keys(changes).length === 0) return { ok: false, error: 'No changes to apply.' }
    const { error } = await supabase
      .from('clients')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', action.client_id)
    if (error) return { ok: false, error: 'Could not update the customer.' }
    const name = `${changes.first_name ?? owned.first_name} ${changes.last_name ?? owned.last_name}`.trim()
    return { ok: true, summary: `Updated ${name}`, link: `/customers/${action.client_id}` }
  }

  if (type === 'add_material') {
    const matName = String(action.name || '').trim()
    if (!matName) return { ok: false, error: 'A material name is required.' }
    const price = Number(action.unit_price)
    if (!Number.isFinite(price)) return { ok: false, error: 'A unit price is required.' }
    const unitRaw = String(action.unit || 'ea').toLowerCase().trim()
    const unit = UNITS.has(unitRaw) ? unitRaw : 'ea'
    const cost = Number(action.unit_cost)
    const { error } = await supabase.from('materials').insert({
      contractor_id: userId,
      name: matName.slice(0, 200),
      unit,
      unit_price: round2(price),
      unit_cost: Number.isFinite(cost) ? round2(cost) : null,
      category: action.category ? String(action.category).slice(0, 100) : null,
    })
    if (error) return { ok: false, error: 'Could not save the material.' }
    return { ok: true, summary: `Added "${matName}" to your price book — $${round2(price).toFixed(2)}/${unit}` }
  }

  if (type === 'refill_price_book') {
    const { added } = await refillPriceBook(supabase, userId, { commit: true })
    if (added === 0) return { ok: true, summary: 'Price book already covers your past quotes — nothing to add.' }
    return { ok: true, summary: `Added ${added} item${added > 1 ? 's' : ''} to your price book from past quotes`, link: '/settings/price-list' }
  }

  if (type === 'create_job') {
    const clientId = await resolveClientIdForAction(supabase, action)
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

  if (type === 'schedule_job') {
    if (!action.job_id) return { ok: false, error: 'No job specified to schedule.' }
    const { data: job } = await supabase.from('jobs').select('id, title').eq('id', action.job_id).maybeSingle()
    if (!job) return { ok: false, error: 'That job was not found in your list.' }
    const start = new Date(action.scheduled_start)
    if (isNaN(start.getTime())) return { ok: false, error: 'I couldn\'t read that date/time.' }
    const end = action.scheduled_end && !isNaN(new Date(action.scheduled_end).getTime())
      ? new Date(action.scheduled_end)
      : new Date(start.getTime() + 2 * 3600 * 1000)
    const { error } = await supabase
      .from('jobs')
      .update({ scheduled_start: start.toISOString(), scheduled_end: end.toISOString() })
      .eq('id', action.job_id)
    if (error) return { ok: false, error: 'Could not schedule the job.' }
    return { ok: true, summary: `Scheduled "${job.title}" for ${formatWhen(start)}`, link: `/dispatch` }
  }

  if (type === 'update_quote') {
    if (!action.invoice_id) return { ok: false, error: 'No quote specified to update.' }
    const { data: inv } = await supabase
      .from('invoices')
      .select('id, status, invoice_number, amount_paid')
      .eq('id', action.invoice_id)
      .maybeSingle()
    if (!inv) return { ok: false, error: 'That quote was not found in your list.' }
    if (inv.status !== 'draft') return { ok: false, error: `Quote ${inv.invoice_number} is ${inv.status} — only drafts can be edited.` }

    const items = normalizeLineItems(action.line_items)
    if (items.length === 0) return { ok: false, error: 'The quote has no valid line items.' }
    const { tax_rate, subtotal, tax_amount, total } = computeTotals(items, action.tax_rate)

    const update: Record<string, unknown> = {
      subtotal,
      tax_rate,
      tax_amount,
      total,
      balance_due: round2(total - Number(inv.amount_paid || 0)),
      updated_at: new Date().toISOString(),
    }
    if (typeof action.notes === 'string') update.notes = action.notes.slice(0, 2000) || null
    const { error: upErr } = await supabase.from('invoices').update(update).eq('id', action.invoice_id)
    if (upErr) return { ok: false, error: 'Could not update the quote.' }

    await supabase.from('invoice_line_items').delete().eq('invoice_id', action.invoice_id)
    const { error: liErr } = await supabase.from('invoice_line_items').insert(lineItemRows(action.invoice_id, items))
    if (liErr) return { ok: false, error: 'Updated the quote but could not save the new line items.' }

    return {
      ok: true,
      summary: `Updated quote ${inv.invoice_number} — $${total.toFixed(2)}`,
      link: `/dashboard/invoices/${action.invoice_id}`,
    }
  }

  if (type === 'create_quote') {
    // Resolve / create the client.
    let clientId: string | null = action.client_id ?? null
    let clientName = action.client_name ?? ''
    if (clientId) {
      const owned = await ownedClient(supabase, clientId)
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

    const { error: liErr } = await supabase.from('invoice_line_items').insert(lineItemRows(invoice.id, items))
    if (liErr) return { ok: false, error: 'Saved the quote but could not add line items.' }

    return {
      ok: true,
      summary: `Draft quote ${invoice.invoice_number} for ${clientName} — $${total.toFixed(2)}`,
      link: `/dashboard/invoices/${invoice.id}`,
    }
  }

  return { ok: false, error: 'Unknown action.' }
}

export function formatWhen(d: Date): string {
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

async function resolveClientIdForAction(supabase: SupabaseClient, action: any): Promise<string | null> {
  if (action.client_id) {
    const owned = await ownedClient(supabase, action.client_id)
    return owned ? owned.id : null
  }
  if (action.customer_name) {
    const res = await resolveCustomer(supabase, action.customer_name)
    if (res.status === 'one') return res.client.id
  }
  return null
}
