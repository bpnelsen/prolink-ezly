import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, serverError } from '../../../../../lib/server-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

async function safeSelect(svc: SupabaseClient, table: string, cols: string): Promise<Row[]> {
  try {
    const { data, error } = await svc.from(table).select(cols)
    if (error) return []
    return (data as Row[]) || []
  } catch {
    return []
  }
}

/** GET /api/v1/admin/overview — platform-wide contractor list + stats. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error
  const svc = auth.supabase

  try {
    const [profiles, customers, clients, jobs, invoices, technicians, websites] = await Promise.all([
      safeSelect(svc, 'profiles', 'id, full_name, email, phone, created_at'),
      safeSelect(svc, 'customers', 'id, business_name'),
      safeSelect(svc, 'clients', 'id, contractor_id, is_deleted'),
      safeSelect(svc, 'jobs', 'id, contractor_id, status, estimated_value'),
      safeSelect(svc, 'invoices', 'id, contractor_id, total, balance_due, status, amount_paid'),
      safeSelect(svc, 'technicians', 'id, contractor_id, is_active'),
      safeSelect(svc, 'contractor_websites', 'id, contractor_id, published'),
    ])

    const bizById = new Map(customers.map(c => [c.id, c.business_name as string | null]))
    const activeClients = clients.filter(c => c.is_deleted !== true)

    const enriched = profiles.map(p => {
      const cClients = activeClients.filter(c => c.contractor_id === p.id)
      const cJobs = jobs.filter(j => j.contractor_id === p.id)
      const cActiveJobs = cJobs.filter(j => ['pending', 'assigned', 'in_progress'].includes(j.status))
      const cInvoices = invoices.filter(i => i.contractor_id === p.id)
      const cOutstanding = cInvoices
        .filter(i => !['paid', 'cancelled', 'draft'].includes(i.status))
        .reduce((s, i) => s + Number(i.balance_due || 0), 0)
      const cRevenue = cInvoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0)
      const cWebsite = websites.find(w => w.contractor_id === p.id)
      const cTechs = technicians.filter(t => t.contractor_id === p.id && t.is_active)

      return {
        id: p.id,
        full_name: p.full_name ?? null,
        email: p.email ?? null,
        business_name: bizById.get(p.id) ?? null,
        phone: p.phone ?? null,
        created_at: p.created_at,
        customer_count: cClients.length,
        job_count: cJobs.length,
        active_job_count: cActiveJobs.length,
        invoice_count: cInvoices.length,
        outstanding: cOutstanding,
        revenue_total: cRevenue,
        has_website: cWebsite?.published || false,
        tech_count: cTechs.length,
      }
    })

    const totalRevenue = invoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0)
    const totalOutstanding = invoices
      .filter(i => !['paid', 'cancelled', 'draft'].includes(i.status))
      .reduce((s, i) => s + Number(i.balance_due || 0), 0)

    const stats = {
      totalContractors: profiles.length,
      activeContractors: enriched.filter(c => (c.active_job_count || 0) > 0).length,
      totalCustomers: activeClients.length,
      totalJobs: jobs.length,
      totalRevenue,
      totalOutstanding,
      totalInvoices: invoices.length,
      websitesPublished: websites.filter(w => w.published).length,
    }

    return NextResponse.json({ data: { contractors: enriched, stats } })
  } catch (err) {
    return serverError('Failed to load admin overview', err instanceof Error ? err.message : String(err))
  }
}
