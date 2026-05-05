'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase-client';
import Breadcrumbs from '../../../components/Breadcrumbs';

interface Pipeline {
  id: string;
  title: string;
  stage: string;
  estimated_value: number;
  created_at: string;
  scheduled_start: string | null;
}

interface Task {
  client_id: string | null;
}

interface Client {
  id: string;
  created_at: string;
}

function startOf(month: number, year: number) {
  return new Date(year, month, 1).toISOString();
}
function endOf(month: number, year: number) {
  return new Date(year, month + 1, 0, 23, 59, 59).toISOString();
}

function KpiCard({
  label,
  value,
  sub,
  trend,
  color = 'text-gray-900',
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-3">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        {trend === 'up' && <TrendingUp size={18} className="text-emerald-500 mb-1" />}
        {trend === 'down' && <TrendingDown size={18} className="text-red-500 mb-1" />}
        {trend === 'neutral' && <Minus size={18} className="text-gray-300 mb-1" />}
      </div>
      {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
    </div>
  );
}

export default function KpisPage() {
  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const id = session.user.id;

      const [{ data: pd }, { data: td }, { data: cd }] = await Promise.all([
        supabase.from('jobs').select('id, title, stage, estimated_value, created_at, scheduled_start').eq('contractor_id', id),
        supabase.from('tasks').select('client_id').eq('contractor_id', id),
        supabase.from('clients').select('id, created_at').eq('contractor_id', id).neq('is_deleted', true),
      ]);

      if (pd) setPipelines(pd);
      if (td) setTasks(td);
      if (cd) setClients(cd);
      setLoading(false);
    };
    fetch();
  }, []);

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const thisMonthStart = startOf(thisMonth, thisYear);
  const thisMonthEnd = endOf(thisMonth, thisYear);
  const lastMonthStart = startOf(lastMonth, lastMonthYear);
  const lastMonthEnd = endOf(lastMonth, lastMonthYear);

  // Jobs
  const jobsThisMonth = pipelines.filter(p => p.created_at >= thisMonthStart && p.created_at <= thisMonthEnd).length;
  const jobsLastMonth = pipelines.filter(p => p.created_at >= lastMonthStart && p.created_at <= lastMonthEnd).length;

  // Revenue
  const completed = pipelines.filter(p => p.stage === 'Completed');
  const revenueThisMonth = completed.filter(p => p.created_at >= thisMonthStart && p.created_at <= thisMonthEnd)
    .reduce((sum, p) => sum + (Number(p.estimated_value) || 0), 0);
  const revenueLastMonth = completed.filter(p => p.created_at >= lastMonthStart && p.created_at <= lastMonthEnd)
    .reduce((sum, p) => sum + (Number(p.estimated_value) || 0), 0);
  const totalRevenue = completed.reduce((sum, p) => sum + (Number(p.estimated_value) || 0), 0);

  // Avg job value
  const avgJobValue = completed.length > 0
    ? Math.round(totalRevenue / completed.length)
    : 0;

  // Win rate
  const totalLeads = pipelines.filter(p => ['Lead', 'Quoted', 'Active', 'Completed'].includes(p.stage)).length;
  const winRate = totalLeads > 0 ? Math.round((completed.length / totalLeads) * 100) : 0;

  // Pipeline value (open jobs)
  const pipelineValue = pipelines
    .filter(p => ['Lead', 'Quoted', 'Active'].includes(p.stage))
    .reduce((sum, p) => sum + (Number(p.estimated_value) || 0), 0);

  // Largest open job
  const openJobs = pipelines.filter(p => ['Lead', 'Quoted', 'Active'].includes(p.stage));
  const largestOpen = openJobs.reduce<Pipeline | null>((max, p) => (!max || Number(p.estimated_value) > Number(max.estimated_value)) ? p : max, null);

  // Customers
  const customersThisMonth = clients.filter(c => c.created_at >= thisMonthStart && c.created_at <= thisMonthEnd).length;
  const customersLastMonth = clients.filter(c => c.created_at >= lastMonthStart && c.created_at <= lastMonthEnd).length;

  // Retention
  const clientTaskCounts = tasks.reduce<Record<string, number>>((acc, t) => {
    if (t.client_id) acc[t.client_id] = (acc[t.client_id] || 0) + 1;
    return acc;
  }, {});
  const clientsWithJobs = Object.keys(clientTaskCounts).length;
  const repeatClients = Object.values(clientTaskCounts).filter(n => n >= 2).length;
  const retentionRate = clientsWithJobs > 0 ? Math.round((repeatClients / clientsWithJobs) * 100) : 0;

  // Customers with no jobs
  const clientIdsWithJobs = new Set(Object.keys(clientTaskCounts));
  const customersNoJobs = clients.filter(c => !clientIdsWithJobs.has(c.id)).length;

  const trend = (curr: number, prev: number): 'up' | 'down' | 'neutral' =>
    curr > prev ? 'up' : curr < prev ? 'down' : 'neutral';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'KPIs', href: '#' }]} />
      <main className="max-w-7xl mx-auto p-4 md:p-8">

        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-200 transition">
            <ArrowLeft size={16} className="text-gray-500" />
          </Link>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Dashboard</p>
            <h1 className="text-2xl font-bold text-gray-900">All KPIs</h1>
          </div>
        </div>

        {/* Jobs */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Jobs & Pipeline</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Jobs This Month"
              value={String(jobsThisMonth)}
              sub={`${jobsLastMonth} last month`}
              trend={trend(jobsThisMonth, jobsLastMonth)}
              color="text-teal-600"
            />
            <KpiCard
              label="Win Rate"
              value={`${winRate}%`}
              sub={`${completed.length} of ${totalLeads} leads closed`}
              color="text-emerald-600"
            />
            <KpiCard
              label="Pipeline Value"
              value={`$${pipelineValue.toLocaleString()}`}
              sub={`${openJobs.length} open jobs`}
              color="text-blue-600"
            />
            <KpiCard
              label="Largest Open Job"
              value={largestOpen ? `$${Number(largestOpen.total_value).toLocaleString()}` : '—'}
              sub={largestOpen?.title ?? 'No open jobs'}
              color="text-gray-900"
            />
          </div>
        </div>

        {/* Revenue */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Revenue</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Revenue This Month"
              value={`$${revenueThisMonth.toLocaleString()}`}
              sub={`$${revenueLastMonth.toLocaleString()} last month`}
              trend={trend(revenueThisMonth, revenueLastMonth)}
              color="text-gray-900"
            />
            <KpiCard
              label="Revenue Last Month"
              value={`$${revenueLastMonth.toLocaleString()}`}
              color="text-gray-900"
            />
            <KpiCard
              label="Total Revenue"
              value={`$${totalRevenue.toLocaleString()}`}
              sub={`${completed.length} completed jobs`}
              color="text-gray-900"
            />
            <KpiCard
              label="Avg Job Value"
              value={`$${avgJobValue.toLocaleString()}`}
              sub="Based on completed jobs"
              color="text-gray-900"
            />
          </div>
        </div>

        {/* Customers */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Customers</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="New Customers This Month"
              value={String(customersThisMonth)}
              sub={`${customersLastMonth} last month`}
              trend={trend(customersThisMonth, customersLastMonth)}
              color="text-blue-600"
            />
            <KpiCard
              label="Total Customers"
              value={String(clients.length)}
              color="text-gray-900"
            />
            <KpiCard
              label="Retention Rate"
              value={`${retentionRate}%`}
              sub={`${repeatClients} repeat customers`}
              color="text-emerald-600"
            />
            <KpiCard
              label="No Jobs Yet"
              value={String(customersNoJobs)}
              sub="Customers with no tasks"
              color="text-yellow-600"
            />
          </div>
        </div>

      </main>
    </div>
  );
}
