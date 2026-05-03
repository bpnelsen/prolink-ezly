import { supabase } from '../config/supabase';
import { Job, Client, Lead, Invoice, Payment, PaginatedResponse } from '../types';

export interface DashboardSummary {
  jobs: { total: number; by_status: Record<string, number> };
  clients: { total: number };
  leads: { total: number; by_status: Record<string, number> };
  invoices: {
    total_revenue: number;
    outstanding: number;
    overdue_count: number;
    open_count: number;
    // New fields for reporting
    revenue_this_month: number;
    invoices_pending_count: number;
  };
}

export interface RevenueDataPoint {
  period: string;
  revenue: number;
  payment_count: number;
}

export interface LeadFunnelItem {
  status: string;
  count: number;
}

export const dashboardService = {
  /**
   * Returns a high-level summary of jobs, clients, leads, and invoice metrics.
   */
  async getSummary(contractorId: string): Promise<DashboardSummary> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [jobsRes, clientsRes, leadsRes, invoicesRes, paymentsRes] = await Promise.all([
      supabase.from('jobs').select('status').eq('contractor_id', contractorId),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('contractor_id', contractorId),
      supabase.from('leads').select('status').eq('contractor_id', contractorId),
      supabase.from('invoices').select('status, balance_due, total, issue_date').eq('contractor_id', contractorId),
      supabase.from('payments').select('amount, paid_at').eq('contractor_id', contractorId),
    ]);

    // Jobs by status
    const jobsByStatus: Record<string, number> = {};
    for (const job of jobsRes.data ?? []) {
      jobsByStatus[job.status] = (jobsByStatus[job.status] ?? 0) + 1;
    }

    // Leads by status
    const leadsByStatus: Record<string, number> = {};
    for (const lead of leadsRes.data ?? []) {
      leadsByStatus[lead.status] = (leadsByStatus[lead.status] ?? 0) + 1;
    }

    // Financial calculations
    const allInvoices = invoicesRes.data ?? [];
    const allPayments = paymentsRes.data ?? [];
    
    const totalRevenue = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const revenueThisMonth = allPayments
      .filter(p => new Date(p.paid_at) >= new Date(startOfMonth))
      .reduce((sum, p) => sum + p.amount, 0);
    
    const outstanding = allInvoices
      .filter((inv) => !['paid', 'cancelled', 'draft'].includes(inv.status))
      .reduce((sum, inv) => sum + (inv.balance_due ?? 0), 0);

    const overdueCount = allInvoices.filter((inv) => inv.status === 'overdue').length;
    const openCount = allInvoices.filter((inv) => ['sent', 'viewed', 'partially_paid'].includes(inv.status)).length;
    const pendingCount = allInvoices.filter((inv) => inv.status === 'draft').length;

    return {
      jobs: { total: jobsRes.data?.length ?? 0, by_status: jobsByStatus },
      clients: { total: clientsRes.count ?? 0 },
      leads: { total: leadsRes.data?.length ?? 0, by_status: leadsByStatus },
      invoices: {
        total_revenue: Math.round(totalRevenue * 100) / 100,
        revenue_this_month: Math.round(revenueThisMonth * 100) / 100,
        outstanding: Math.round(outstanding * 100) / 100,
        overdue_count: overdueCount,
        open_count: openCount,
        invoices_pending_count: pendingCount,
      },
    };
  },

  /**
   * Returns monthly revenue totals for a given year (defaults to current year).
   */
  async getRevenue(contractorId: string, year?: number): Promise<RevenueDataPoint[]> {
    const targetYear = year ?? new Date().getFullYear();
    const startDate = `${targetYear}-01-01T00:00:00Z`;
    const endDate = `${targetYear + 1}-01-01T00:00:00Z`;

    const { data, error } = await supabase
      .from('payments')
      .select('amount, paid_at')
      .eq('contractor_id', contractorId)
      .gte('paid_at', startDate)
      .lt('paid_at', endDate)
      .order('paid_at');

    if (error) throw new Error(error.message);

    const monthlyMap: Record<string, { revenue: number; payment_count: number }> = {};
    for (let m = 1; m <= 12; m++) {
      const key = `${targetYear}-${String(m).padStart(2, '0')}`;
      monthlyMap[key] = { revenue: 0, payment_count: 0 };
    }

    for (const payment of data ?? []) {
      const date = new Date(payment.paid_at);
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[key]) {
        monthlyMap[key].revenue += payment.amount;
        monthlyMap[key].payment_count += 1;
      }
    }

    return Object.entries(monthlyMap).map(([period, vals]) => ({
      period,
      revenue: Math.round(vals.revenue * 100) / 100,
      payment_count: vals.payment_count,
    }));
  },

  /**
   * Returns the lead funnel breakdown and recent leads.
   */
  async getLeads(contractorId: string): Promise<{ funnel: LeadFunnelItem[]; recent: unknown[] }> {
    const [allLeadsRes, recentLeadsRes] = await Promise.all([
      supabase.from('leads').select('status').eq('contractor_id', contractorId),
      supabase
        .from('leads')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (allLeadsRes.error) throw new Error(allLeadsRes.error.message);

    const statusOrder = ['new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost'];
    const countMap: Record<string, number> = {};
    for (const lead of allLeadsRes.data ?? []) {
      countMap[lead.status] = (countMap[lead.status] ?? 0) + 1;
    }

    const funnel = statusOrder.map((status) => ({ status, count: countMap[status] ?? 0 }));

    return { funnel, recent: recentLeadsRes.data ?? [] };
  },
};
