'use client'
import { useState, useEffect } from 'react';
import { LogOut, Menu, X, Plus, Users, CalendarDays, TrendingUp, Briefcase, ChevronRight, Clock, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase-client';

const handleLogout = async () => {
  await supabase.auth.signOut();
  window.location.href = '/login';
};

const STAGES = ['Lead', 'Quoted', 'Active', 'Completed'];

const STAGE_COLORS: Record<string, string> = {
  Lead:      'bg-yellow-400',
  Quoted:    'bg-blue-400',
  Active:    'bg-teal-500',
  Completed: 'bg-gray-400',
};

const STAGE_BADGE: Record<string, string> = {
  Lead:      'bg-yellow-50 text-yellow-700 border-yellow-200',
  Quoted:    'bg-blue-50 text-blue-700 border-blue-200',
  Active:    'bg-teal-50 text-teal-700 border-teal-200',
  Completed: 'bg-gray-100 text-gray-600 border-gray-200',
};

interface Pipeline {
  id: string;
  project_name: string;
  stage: string;
  value: number;
  created_at: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

interface Task {
  client_id: string | null;
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }

        const id = session.user.id;

        const [{ data: pipelineData }, { data: clientData }, { data: taskData }] = await Promise.all([
          supabase.from('pl_pipelines').select('id, project_name, stage, value, created_at').eq('contractor_id', id).order('created_at', { ascending: false }),
          supabase.from('clients').select('id, first_name, last_name, created_at').eq('contractor_id', id).neq('is_deleted', true).order('created_at', { ascending: false }),
          supabase.from('tasks').select('client_id').eq('contractor_id', id),
        ]);

        if (pipelineData) setPipelines(pipelineData);
        if (clientData) setClients(clientData);
        if (taskData) setTasks(taskData);
      } catch (err) {
        console.error('Failed to fetch dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const monthStart = startOfMonth();
  const jobsThisMonth = pipelines.filter(p => p.created_at >= monthStart).length;
  const customersThisMonth = clients.filter(c => c.created_at >= monthStart).length;

  const completedJobs = pipelines.filter(p => p.stage === 'Completed');
  const avgJobValue = completedJobs.length > 0
    ? Math.round(completedJobs.reduce((sum, p) => sum + (Number(p.value) || 0), 0) / completedJobs.length)
    : 0;

  const clientTaskCounts = tasks.reduce<Record<string, number>>((acc, t) => {
    if (t.client_id) acc[t.client_id] = (acc[t.client_id] || 0) + 1;
    return acc;
  }, {});
  const clientsWithJobs = Object.keys(clientTaskCounts).length;
  const repeatClients = Object.values(clientTaskCounts).filter(n => n >= 2).length;
  const retentionRate = clientsWithJobs > 0 ? Math.round((repeatClients / clientsWithJobs) * 100) : 0;

  const activeJobs = pipelines.filter(p => p.stage === 'Active').length;
  const newLeads = pipelines.filter(p => p.stage === 'Lead').length;
  const totalCustomers = clients.length;

  const stageCounts = STAGES.map(s => ({ stage: s, count: pipelines.filter(p => p.stage === s).length }));
  const totalPipelines = pipelines.length || 1;

  const recentActivity = [
    ...pipelines.slice(0, 5).map(p => ({ type: 'job' as const, label: p.project_name, sub: p.stage, date: p.created_at, href: '/dashboard' })),
    ...clients.slice(0, 5).map(c => ({ type: 'customer' as const, label: `${c.first_name} ${c.last_name}`, sub: 'New Customer', date: c.created_at, href: `/customers/${c.id}` })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const navLinks = [
    { name: 'Schedule', href: '/dispatch' },
    { name: 'Customers', href: '/customers' },
    { name: 'Blog', href: '/blog' },
    { name: 'Reports', href: '/dashboard/reports' },
    { name: 'Market Intel', href: '/dashboard/market-intelligence' },
    { name: 'Settings', href: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Prolink</h1>
          <div className="hidden md:flex gap-6 items-center">
            {navLinks.map(link => (
              <Link key={link.name} href={link.href} className="text-sm font-semibold text-gray-600 hover:text-teal-600">{link.name}</Link>
            ))}
            <Link href="/new-job" className="bg-teal-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-teal-700 shadow-sm">+ New Job</Link>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-600" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
          <div className="md:hidden flex items-center gap-3">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-gray-700">
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-3 mt-2 flex flex-col gap-3 px-4 shadow-lg rounded-b-xl">
            {navLinks.map(link => (
              <Link key={link.name} href={link.href} onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-gray-800 p-2 hover:bg-gray-50 rounded">
                {link.name}
              </Link>
            ))}
            <Link href="/new-job" onClick={() => setMenuOpen(false)} className="bg-teal-600 text-white text-center py-2.5 rounded-lg font-semibold text-sm">+ New Job</Link>
            <button onClick={handleLogout} className="text-red-600 font-semibold text-sm p-2 text-left">Logout</button>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">

        {/* Header */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Overview</p>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI Stats */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-gray-900">KPIs</h3>
                  <p className="text-xs text-gray-400 mt-0.5">This month at a glance</p>
                </div>
                <Link href="/dashboard/kpis" className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700">
                  <BarChart2 size={13} /> View All KPIs
                </Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Jobs This Month</p>
                  <p className="text-2xl font-bold text-teal-600">{jobsThisMonth}</p>
                  <p className="text-xs text-gray-400 mt-1">{pipelines.length} total</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">New Customers</p>
                  <p className="text-2xl font-bold text-blue-600">{customersThisMonth}</p>
                  <p className="text-xs text-gray-400 mt-1">{totalCustomers} total</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Retention Rate</p>
                  <p className="text-2xl font-bold text-emerald-600">{retentionRate}%</p>
                  <p className="text-xs text-gray-400 mt-1">Repeat customers</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Avg Job Value</p>
                  <p className="text-2xl font-bold text-gray-900">${avgJobValue.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">Completed jobs</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Pipeline Breakdown */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-gray-900">Pipeline</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{pipelines.length} total jobs</p>
                  </div>
                  <TrendingUp size={18} className="text-gray-300" />
                </div>

                {pipelines.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No jobs yet. Create your first job to see the pipeline.</div>
                ) : (
                  <>
                    {/* Stacked bar */}
                    <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-5">
                      {stageCounts.filter(s => s.count > 0).map(s => (
                        <div
                          key={s.stage}
                          className={`${STAGE_COLORS[s.stage]} transition-all`}
                          style={{ width: `${(s.count / totalPipelines) * 100}%` }}
                        />
                      ))}
                    </div>

                    {/* Stage rows */}
                    <div className="space-y-3">
                      {stageCounts.map(s => (
                        <div key={s.stage} className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${STAGE_COLORS[s.stage]}`} />
                            <span className="text-sm text-gray-700 font-medium">{s.stage}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${STAGE_COLORS[s.stage]} rounded-full`}
                                style={{ width: `${(s.count / totalPipelines) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-gray-900 w-4 text-right">{s.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Recent jobs list */}
                {pipelines.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-gray-100 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Recent Jobs</p>
                    {pipelines.slice(0, 4).map(p => (
                      <div key={p.id} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <Briefcase size={13} className="text-gray-300 shrink-0" />
                          <span className="text-sm text-gray-700 truncate">{p.project_name}</span>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ml-3 shrink-0 ${STAGE_BADGE[p.stage] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {p.stage}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="space-y-6">

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <Link href="/new-job" className="flex items-center justify-between w-full p-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition">
                      <div className="flex items-center gap-2.5">
                        <Plus size={15} />
                        <span className="text-sm font-bold">New Job</span>
                      </div>
                      <ChevronRight size={14} />
                    </Link>
                    <Link href="/customers/new" className="flex items-center justify-between w-full p-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 transition">
                      <div className="flex items-center gap-2.5">
                        <Users size={15} className="text-gray-400" />
                        <span className="text-sm font-semibold">Add Customer</span>
                      </div>
                      <ChevronRight size={14} className="text-gray-400" />
                    </Link>
                    <Link href="/dispatch" className="flex items-center justify-between w-full p-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 transition">
                      <div className="flex items-center gap-2.5">
                        <CalendarDays size={15} className="text-gray-400" />
                        <span className="text-sm font-semibold">View Schedule</span>
                      </div>
                      <ChevronRight size={14} className="text-gray-400" />
                    </Link>
                    <Link href="/customers" className="flex items-center justify-between w-full p-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 transition">
                      <div className="flex items-center gap-2.5">
                        <Briefcase size={15} className="text-gray-400" />
                        <span className="text-sm font-semibold">Customer Hub</span>
                      </div>
                      <ChevronRight size={14} className="text-gray-400" />
                    </Link>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Recent Activity</h3>
                  {recentActivity.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No activity yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.map((item, i) => (
                        <Link key={i} href={item.href} className="flex items-start gap-3 hover:bg-gray-50 rounded-lg p-1.5 -mx-1.5 transition">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.type === 'job' ? 'bg-teal-100' : 'bg-blue-100'}`}>
                            {item.type === 'job'
                              ? <Briefcase size={12} className="text-teal-600" />
                              : <Users size={12} className="text-blue-600" />
                            }
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800 truncate">{item.label}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Clock size={9} />
                              {item.sub} · {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
