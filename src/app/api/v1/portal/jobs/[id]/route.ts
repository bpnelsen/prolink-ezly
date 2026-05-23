import { NextRequest, NextResponse } from 'next/server'
import { requireClient, notFound } from '../../../../../../lib/server-auth'

export const runtime = 'nodejs'

/**
 * GET /api/v1/portal/jobs/:id
 *
 * Returns a single job + related contracts/invoices/conversation, scoped
 * to one of the calling portal user's linked clients. requireClient
 * already returns a service-role client filtered by clientIds, so the
 * .in('client_id', clientIds) guard makes a job from another household
 * unreachable.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireClient(_req)
  if ('error' in auth) return auth.error
  const { supabase, clientIds } = auth

  if (clientIds.length === 0) return notFound('Job not found')

  const { data: job } = await supabase
    .from('jobs')
    .select('id, title, description, status, trade, estimated_value, scheduled_start, scheduled_end, created_at, completed_at, address, contractor_id, client_id')
    .eq('id', params.id)
    .in('client_id', clientIds)
    .maybeSingle()

  if (!job) return notFound('Job not found')

  const [
    { data: contractorCustomer },
    { data: contractorProfile },
    { data: contracts },
    { data: invoices },
    { data: conversation },
  ] = await Promise.all([
    supabase
      .from('customers')
      .select('business_name, phone, website, logo_url')
      .eq('id', job.contractor_id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', job.contractor_id)
      .maybeSingle(),
    supabase
      .from('contracts')
      .select('id, contract_number, status, contract_sum, created_at')
      .eq('job_id', job.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, invoice_number, status, total, balance_due, issue_date, due_date')
      .eq('job_id', job.id)
      .order('issue_date', { ascending: false }),
    supabase
      .from('conversations')
      .select('id, last_message_at')
      .eq('job_id', job.id)
      .maybeSingle(),
  ])

  return NextResponse.json({
    data: {
      job,
      contractor: {
        ...(contractorCustomer || {}),
        full_name: contractorProfile?.full_name || null,
        email: contractorProfile?.email || null,
      },
      contracts: contracts || [],
      invoices: invoices || [],
      conversation: conversation || null,
    },
  })
}
