'use client'
import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, Users, Briefcase, BarChart2, LogOut,
  Bell, Search, Plus, TrendingUp, Clock, ChevronRight,
  FileText, Settings, User,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase-client';
import { useRefetchOnJobsChange } from '../../lib/data-events';

const STAGES = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'];

const STAGE_COLORS: Record<string, string> = {
  pending:     'bg-yellow-400',
  assigned:    'bg-blue-400',
  in_progress: 'bg-orange-400',
  completed:   'bg-green-500',
  cancelled:   'bg-gray-300',
};

const STAGE_LABELS: Record<string, string> = {
  pending:     'Pending',
  assigned:    'Assigned',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
};

const STAGE_BADGE: Record<string, string> = {
  pending:     'bg-yellow-50 text-yellow-700 border-yellow-200',
  assigned:    'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-orange-50 text-orange-700 border-orange-200',
  completed:   'bg-green-50 text-green-700 border-green-200',
  cancelled:   'bg-gray-100 text-gray-500 border-gray-200',
};

interface Job {
  id: string;
  title: string;
  status: string;
  estimated_value: number | null;
  created_at: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  balance_due: number;
  amount_paid: number;
  issue_date: string;
  paid_at: string | null;
  client_id: string | null;
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}


export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const id = session.user.id;
      setUserEmail(session.user.email ?? '');

      const [{ data: jobData }, { data: clientData }, { data: invoiceData }, { data: profileData }, { data: bizData }] = await Promise.all([
        supabase.from('jobs').select('id, title, status, estimated_value, created_at').eq('contractor_id', id).order('created_at', { ascending: false }),
        supabase.from('clients').select('id, first_name, last_name, created_at').eq('contractor_id', id).neq('is_deleted', true).order('created_at', { ascending: false }),
        supabase.from('invoices').select('id, invoice_number, status, total, balance_due, amount_paid, issue_date, paid_at, client_id').eq('contractor_id', id).order('issue_date', { ascending: false }),
        supabase.from('profiles').select('full_name').eq('id', id).single(),
        supabase.from('customers').select('business_name, owner_name').eq('id', id).single(),
      ]);

      const displayName = bizData?.business_name || bizData?.owner_name || profileData?.full_name || session.user.email?.split('@')[0] || 'there';
      setUserName(displayName);
      setBusinessName(bizData?.business_name || '');
      if (jobData) setJobs(jobData);
      if (clientData) setClients(clientData);
      if (invoiceData) setInvoices(invoiceData);
    } catch (err) {
      console.error('Failed to fetch dashboard', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Re-fetch the moment any other page edits / creates / deletes a job
  // so pipeline counts and recent jobs aren't stale on revisit.
  useRefetchOnJobsChange(fetchDashboard);

  const monthStart = startOfMonth();

  // Invoice-based stats
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const paidThisMonth = paidInvoices.filter(i => i.paid_at && i.paid_at >= monthStart);
  const revenueThisMonth = paidThisMonth.reduce((s, i) => s + Number(i.total), 0);
  const revenueTotal = paidInvoices.reduce((s, i) => s + Number(i.total), 0);

  const openInvoices = invoices.filter(i => ['sent', 'viewed', 'partially_paid', 'overdue'].includes(i.status));
  const outstanding = openInvoices.reduce((s, i) => s + Number(i.balance_due), 0);

  // Job-based stats
  const activeJobs = jobs.filter(j => ['pending', 'assigned', 'in_progress'].includes(j.status));
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const completedThisMonth = completedJobs.filter(j => j.created_at >= monthStart);
  const pipelineValue = activeJobs.reduce((s, j) => s + (Number(j.estimated_value) || 0), 0);

  const avgJobValue = paidInvoices.length > 0
    ? Math.round(revenueTotal / paidInvoices.length)
    : completedJobs.length > 0
      ? Math.round(completedJobs.reduce((s, j) => s + (Number(j.estimated_value) || 0), 0) / completedJobs.length)
      : 0;

  // Customer stats
  const customersThisMonth = clients.filter(c => c.created_at >= monthStart).length;
  const totalCustomers = clients.length;

  const stageCounts = STAGES.map(s => ({ stage: s, count: jobs.filter(j => j.status === s).length }));
  const totalJobs = jobs.length || 1;

  const recentActivity = [
    ...jobs.slice(0, 5).map(j => ({ type: 'job' as const, label: j.title, sub: STAGE_LABELS[j.status] || j.status, date: j.created_at, href: `/dashboard/jobs/${j.id}` })),
    ...clients.slice(0, 5).map(c => ({ type: 'customer' as const, label: `${c.first_name} ${c.last_name}`, sub: 'New Customer', date: c.created_at, href: `/customers/${c.id}` })),
    ...invoices.slice(0, 3).map(i => ({ type: 'invoice' as const, label: i.invoice_number, sub: i.status === 'paid' ? `Paid $${Number(i.total).toLocaleString()}` : `$${Number(i.total).toLocaleString()} ${i.status}`, date: i.issue_date, href: `/dashboard/invoices/${i.id}` })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const searchResults = searchQuery.trim().length >= 2 ? (() => {
    const q = searchQuery.toLowerCase();
    const matchedJobs = jobs
      .filter(j => j.title?.toLowerCase().includes(q) || j.status?.toLowerCase().includes(q))
      .slice(0, 4)
      .map(j => ({ type: 'job' as const, label: j.title, sub: STAGE_LABELS[j.status] || j.status || 'Job', href: `/dashboard/jobs/${j.id}` }));
    const matchedClients = clients
      .filter(c => `${c.first_name} ${c.last_name}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map(c => ({ type: 'customer' as const, label: `${c.first_name} ${c.last_name}`, sub: 'Customer', href: `/customers/${c.id}` }));
    return [...matchedJobs, ...matchedClients];
  })() : [];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const initials = userName.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-auto">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 pl-12 md:pl-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{businessName || 'Dashboard'}</h1>
              <p className="text-xs text-gray-400">{greeting()}, {userName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
                  if (e.key === 'Enter' && searchResults.length > 0) window.location.href = searchResults[0].href;
                }}
                className="bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm w-64 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition outline-none"
                placeholder="Search jobs, customers..."
              />
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-full mt-1 left-0 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {searchResults.map((r, i) => (
                    <a key={i} href={r.href}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${r.type === 'job' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                        {r.type === 'job' ? 'J' : 'C'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{r.label}</p>
                        <p className="text-xs text-gray-400">{r.sub}</p>
                      </div>
                    </a>
                  ))}
                  {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                    <p className="px-4 py-3 text-sm text-gray-400">No results for &ldquo;{searchQuery}&rdquo;</p>
                  )}
                </div>
              )}
              {searchOpen && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <div className="absolute top-full mt-1 left-0 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4">
                  <p className="text-sm text-gray-400">No results for &ldquo;{searchQuery}&rdquo;</p>
                </div>
              )}
            </div>
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition">
              <Bell size={18} className="text-gray-500" />
            </button>
            <div className="relative">
              <button
                onClick={() => setAvatarOpen(v => !v)}
                onBlur={() => setTimeout(() => setAvatarOpen(false), 150)}
                className="w-8 h-8 rounded-full bg-[#0f1d35] flex items-center justify-center text-white text-xs font-bold hover:bg-[#1a3060] transition"
              >
                {initials}
              </button>
              {avatarOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-800 truncate">{userName}</p>
                    <p className="text-[10px] text-gray-400 truncate">{userEmail}</p>
                  </div>
                  <Link href="/settings/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                    <User size={14} className="text-gray-400" /> Company Profile
                  </Link>
                  <Link href="/settings" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                    <Settings size={14} className="text-gray-400" /> Settings
                  </Link>
                  <div className="border-t border-gray-100">
                    <button
                      onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition w-full text-left"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6 overflow-auto">

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* KPI Section */}
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
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Revenue This Month</p>
                    <p className="text-2xl font-bold text-teal-600">
                      ${revenueThisMonth >= 1000 ? `${(revenueThisMonth / 1000).toFixed(1)}k` : revenueThisMonth.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">${revenueTotal >= 1000 ? `${(revenueTotal / 1000).toFixed(1)}k` : revenueTotal.toLocaleString()} all time</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Outstanding</p>
                    <p className={`text-2xl font-bold ${outstanding > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                      ${outstanding >= 1000 ? `${(outstanding / 1000).toFixed(1)}k` : outstanding.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{openInvoices.length} open invoice{openInvoices.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Active Jobs</p>
                    <p className="text-2xl font-bold text-blue-600">{activeJobs.length}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      ${pipelineValue >= 1000 ? `${(pipelineValue / 1000).toFixed(1)}k` : pipelineValue.toLocaleString()} pipeline
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">New Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{customersThisMonth}</p>
                    <p className="text-xs text-gray-400 mt-1">{totalCustomers} total</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Pipeline */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-bold text-gray-900">Job Pipeline</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{jobs.length} total · {completedThisMonth.length} completed this month</p>
                    </div>
                    <Link href="/dashboard/jobs" className="text-xs font-semibold text-teal-600 hover:text-teal-700">View All</Link>
                  </div>

                  {jobs.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">No jobs yet. Create your first job to see the pipeline.</div>
                  ) : (
                    <>
                      <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-5">
                        {stageCounts.filter(s => s.count > 0).map(s => (
                          <div key={s.stage} className={`${STAGE_COLORS[s.stage]} transition-all`}
                            style={{ width: `${(s.count / totalJobs) * 100}%` }} />
                        ))}
                      </div>
                      <div className="space-y-3">
                        {stageCounts.filter(s => s.count > 0).map(s => (
                          <div key={s.stage} className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-2.5 h-2.5 rounded-full ${STAGE_COLORS[s.stage]}`} />
                              <span className="text-sm text-gray-700 font-medium">{STAGE_LABELS[s.stage]}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full ${STAGE_COLORS[s.stage]} rounded-full`}
                                  style={{ width: `${(s.count / totalJobs) * 100}%` }} />
                              </div>
                              <span className="text-sm font-bold text-gray-900 w-4 text-right">{s.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {jobs.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-gray-100 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Recent Jobs</p>
                      {jobs.slice(0, 4).map(j => (
                        <Link key={j.id} href={`/dashboard/jobs/${j.id}`} className="flex items-center justify-between py-1.5 hover:bg-gray-50 rounded-lg px-1 -mx-1 transition">
                          <div className="flex items-center gap-3 min-w-0">
                            <Briefcase size={13} className="text-gray-300 shrink-0" />
                            <span className="text-sm text-gray-700 truncate">{j.title}</span>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ml-3 shrink-0 ${STAGE_BADGE[j.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {STAGE_LABELS[j.status] || j.status}
                          </span>
                        </Link>
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
                        <div className="flex items-center gap-2.5"><Plus size={15} /><span className="text-sm font-bold">New Job</span></div>
                        <ChevronRight size={14} />
                      </Link>
                      <Link href="/customers/new" className="flex items-center justify-between w-full p-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 transition">
                        <div className="flex items-center gap-2.5"><Users size={15} className="text-gray-400" /><span className="text-sm font-semibold">Add Customer</span></div>
                        <ChevronRight size={14} className="text-gray-400" />
                      </Link>
                      <Link href="/dispatch" className="flex items-center justify-between w-full p-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 transition">
                        <div className="flex items-center gap-2.5"><CalendarDays size={15} className="text-gray-400" /><span className="text-sm font-semibold">View Schedule</span></div>
                        <ChevronRight size={14} className="text-gray-400" />
                      </Link>
                      <Link href="/customers" className="flex items-center justify-between w-full p-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 transition">
                        <div className="flex items-center gap-2.5"><Briefcase size={15} className="text-gray-400" /><span className="text-sm font-semibold">Customer Hub</span></div>
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
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              item.type === 'job' ? 'bg-teal-100' : item.type === 'invoice' ? 'bg-green-100' : 'bg-blue-100'
                            }`}>
                              {item.type === 'job' ? <Briefcase size={12} className="text-teal-600" />
                                : item.type === 'invoice' ? <FileText size={12} className="text-green-600" />
                                : <Users size={12} className="text-blue-600" />}
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
