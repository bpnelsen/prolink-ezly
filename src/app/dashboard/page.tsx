'use client'
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, CalendarDays, Users, Briefcase,
  BarChart2, LogOut, Bell, Search,
  Plus, TrendingUp, Clock, ChevronRight, Menu, X, Globe
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabase-client';
import ProlinkLogo from '../../components/ProlinkLogo';

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

interface Job {
  id: string;
  title: string;
  stage: string;
  estimated_value: number;
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

const NAV_MAIN = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Schedule', href: '/dispatch', icon: CalendarDays },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Jobs', href: '/new-job', icon: Briefcase },
];

const NAV_MARKETING = [
  { label: 'Website Builder', href: '/dashboard/website-builder', icon: Globe },
];

const NAV_GROWTH = [
  { label: 'Analytics', href: '/dashboard/kpis', icon: BarChart2 },
];

function Sidebar({ open, onClose, userName }: { open: boolean; onClose: () => void; userName: string }) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-56 z-30 flex flex-col
        bg-[#0f1d35] transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:flex
      `}>
        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-between">
          <ProlinkLogo className="w-40 h-auto" />
          <button onClick={onClose} className="md:hidden text-white/50 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-6 overflow-y-auto">
          {/* Main */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-2 mb-2">Main</p>
            <ul className="space-y-0.5">
              {NAV_MAIN.map(({ label, href, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      isActive(href)
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={17} className={isActive(href) ? 'text-teal-400' : ''} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Marketing */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-2 mb-2">Marketing</p>
            <ul className="space-y-0.5">
              {NAV_MARKETING.map(({ label, href, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      isActive(href)
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={17} className={isActive(href) ? 'text-teal-400' : ''} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Growth */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-2 mb-2">Growth</p>
            <ul className="space-y-0.5">
              {NAV_GROWTH.map(({ label, href, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      isActive(href)
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={17} className={isActive(href) ? 'text-teal-400' : ''} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-white/50 hover:text-white hover:bg-white/5 transition w-full"
          >
            <LogOut size={17} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }

        const id = session.user.id;
        setUserName(session.user.email?.split('@')[0] ?? 'there');

        const [{ data: jobData }, { data: clientData }, { data: taskData }] = await Promise.all([
          supabase.from('jobs').select('id, title, stage, estimated_value, created_at').eq('contractor_id', id).order('created_at', { ascending: false }),
          supabase.from('clients').select('id, first_name, last_name, created_at').eq('contractor_id', id).neq('is_deleted', true).order('created_at', { ascending: false }),
          supabase.from('tasks').select('client_id').eq('contractor_id', id),
        ]);

        if (jobData) setJobs(jobData);
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
  const jobsThisMonth = jobs.filter(p => p.created_at >= monthStart).length;
  const customersThisMonth = clients.filter(c => c.created_at >= monthStart).length;

  const completedJobs = jobs.filter(p => p.stage === 'Completed');
  const avgJobValue = completedJobs.length > 0
    ? Math.round(completedJobs.reduce((sum, p) => sum + (Number(p.estimated_value) || 0), 0) / completedJobs.length)
    : 0;

  const clientTaskCounts = tasks.reduce<Record<string, number>>((acc, t) => {
    if (t.client_id) acc[t.client_id] = (acc[t.client_id] || 0) + 1;
    return acc;
  }, {});
  const clientsWithJobs = Object.keys(clientTaskCounts).length;
  const repeatClients = Object.values(clientTaskCounts).filter(n => n >= 2).length;
  const retentionRate = clientsWithJobs > 0 ? Math.round((repeatClients / clientsWithJobs) * 100) : 0;

  const activeJobs = jobs.filter(p => p.stage === 'Active').length;
  const newLeads = jobs.filter(p => p.stage === 'Lead').length;
  const totalCustomers = clients.length;
  const totalRevenue = completedJobs.reduce((sum, p) => sum + (Number(p.estimated_value) || 0), 0);

  const stageCounts = STAGES.map(s => ({ stage: s, count: jobs.filter(p => p.stage === s).length }));
  const totalJobs = jobs.length || 1;

  const recentActivity = [
    ...jobs.slice(0, 5).map(p => ({ type: 'job' as const, label: p.title, sub: p.stage, date: p.created_at, href: '/dashboard' })),
    ...clients.slice(0, 5).map(c => ({ type: 'customer' as const, label: `${c.first_name} ${c.last_name}`, sub: 'New Customer', date: c.created_at, href: `/customers/${c.id}` })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const initials = userName.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} userName={userName} />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-gray-700">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-xs text-gray-400">{greeting()}, {userName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                className="bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm w-56 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                placeholder="Search jobs, customers..."
              />
            </div>
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition">
              <Bell size={18} className="text-gray-500" />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#0f1d35] flex items-center justify-center text-white text-xs font-bold">
              {initials}
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
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Jobs This Month</p>
                    <p className="text-2xl font-bold text-teal-600">{jobsThisMonth}</p>
                    <p className="text-xs text-gray-400 mt-1">{jobs.length} total</p>
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

                {/* Pipeline */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-bold text-gray-900">Pipeline</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{jobs.length} total jobs</p>
                    </div>
                    <TrendingUp size={18} className="text-gray-300" />
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
                        {stageCounts.map(s => (
                          <div key={s.stage} className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-2.5 h-2.5 rounded-full ${STAGE_COLORS[s.stage]}`} />
                              <span className="text-sm text-gray-700 font-medium">{s.stage}</span>
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
                      {jobs.slice(0, 4).map(p => (
                        <div key={p.id} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <Briefcase size={13} className="text-gray-300 shrink-0" />
                            <span className="text-sm text-gray-700 truncate">{p.title}</span>
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
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.type === 'job' ? 'bg-teal-100' : 'bg-blue-100'}`}>
                              {item.type === 'job' ? <Briefcase size={12} className="text-teal-600" /> : <Users size={12} className="text-blue-600" />}
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
    </div>
  );
}
