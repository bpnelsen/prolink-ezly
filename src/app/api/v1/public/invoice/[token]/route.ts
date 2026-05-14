import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/server-auth'

// Public invoice viewer endpoint. Replaces the prior pattern where the
// customer portal hit Supabase directly with the anon key, which forced RLS on
// public.invoices to be USING (true) and leaked every invoice on the platform.
//
// This route uses the service_role key (never exposed to the browser) and
// scopes by public_token, so only the one invoice matching the token is
// returned.

export const dynamic = 'force-dynamic'

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token
  if (!token || !TOKEN_RE.test(token)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const supabase = serviceClient()

  const { data: inv } = await supabase
    .from('invoices')
    .select('*, clients(first_name, last_name, email, phone, address_line1, address_line2)')
    .eq('public_token', token)
    .maybeSingle()

  if (!inv) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const [{ data: biz }, { data: prof }, { data: items }, { data: pays }] = await Promise.all([
    supabase
      .from('customers')
      .select('business_name, logo_url, phone, street_address, city, state, zip_code')
      .eq('id', inv.contractor_id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', inv.contractor_id)
      .maybeSingle(),
    supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', inv.id)
      .order('position'),
    supabase
      .from('payments')
      .select('id, amount, payment_method, paid_at')
      .eq('invoice_id', inv.id)
      .order('paid_at', { ascending: false }),
  ])

  let job: unknown = null
  if (inv.job_id) {
    const { data: j } = await supabase
      .from('jobs')
      .select('title, scheduled_start, technicians(name)')
      .eq('id', inv.job_id)
      .maybeSingle()
    job = j
  }

  if (inv.status === 'sent' && !inv.viewed_at) {
    await supabase
      .from('invoices')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', inv.id)
  }

  return NextResponse.json({
    invoice: { ...inv, business: { ...(biz || {}), ...(prof || {}) }, job },
    lineItems: items || [],
    payments: pays || [],
  })
}
