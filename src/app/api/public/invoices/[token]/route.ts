import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '../../../../../lib/server-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/public/invoices/:token
 *
 * Token-scoped public lookup for the customer-facing invoice page. Runs
 * server-side with the service-role key so it works regardless of
 * whether the SECURITY DEFINER `get_public_invoice` RPC has been
 * installed in this Supabase project. The token itself (a UUID) is
 * unenumerable, so possession of the token is the auth.
 *
 * Returns: { invoice, line_items, payments } in the same shape the page
 * previously expected from the RPC.
 */
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token
  // Reject obviously-malformed tokens (the column is uuid).
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 404 })
  }

  let supabase
  try {
    supabase = serviceClient()
  } catch (e) {
    return NextResponse.json(
      { error: 'server_misconfigured', message: 'SUPABASE_SERVICE_ROLE_KEY is not set.' },
      { status: 500 }
    )
  }

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .select('*')
    .eq('public_token', token)
    .maybeSingle()

  if (invErr) {
    return NextResponse.json({ error: 'lookup_failed', message: invErr.message }, { status: 500 })
  }
  if (!invoice) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Resolve related rows in parallel. All scoped by ids already on the invoice.
  const [
    { data: client },
    { data: contractor },
    { data: contractorProfile },
    { data: job },
    { data: lineItems },
    { data: payments },
  ] = await Promise.all([
    invoice.client_id
      ? supabase
          .from('clients')
          .select('first_name, last_name, email, phone, street_address, city, state, zip_code')
          .eq('id', invoice.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    invoice.contractor_id
      ? supabase
          .from('customers')
          .select('business_name, logo_url, phone, street_address, city, state, zip_code, website')
          .eq('id', invoice.contractor_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    invoice.contractor_id
      ? supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', invoice.contractor_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    invoice.job_id
      ? supabase
          .from('jobs')
          .select('title, scheduled_start')
          .eq('id', invoice.job_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('position', { ascending: true }),
    supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('paid_at', { ascending: false }),
  ])

  // Best-effort "mark viewed" so the contractor sees the read receipt.
  if (invoice.status === 'sent' && !invoice.viewed_at) {
    await supabase
      .from('invoices')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', invoice.id)
  }

  return NextResponse.json({
    invoice: {
      ...invoice,
      clients: client || null,
      business: {
        ...(contractor || {}),
        full_name: contractorProfile?.full_name || null,
        email: contractorProfile?.email || null,
      },
      job: job || null,
    },
    line_items: lineItems || [],
    payments: payments || [],
  })
}
