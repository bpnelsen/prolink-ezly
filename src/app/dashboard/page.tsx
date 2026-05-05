'use client'
import { useState, useEffect } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase-client';

const handleLogout = async () => {
  await supabase.auth.signOut();
  window.location.href = '/login';
};

interface DashboardStats {
  total_revenue: number;
  active_jobs: number;
  new_leads: number;
  avg_value: number;
}

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    total_revenue: 0,
    active_jobs: 0,
    new_leads: 0,
    avg_value: 0,
  });

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }

        const contractorId = session.user.id;

        // Fetch pipeline stats from Supabase directly
        const { data: pipelines } = await supabase
          .from('pl_pipelines')
          .select('stage, value')
          .eq('contractor_id', contractorId);

        if (pipelines) {
          const active = pipelines.filter(p => p.stage === 'Active');
          const leads = pipelines.filter(p => p.stage === 'Lead');
          const totalRevenue = pipelines
            .filter(p => p.stage === 'Completed')
            .reduce((sum, p) => sum + (Number(p.value) || 0), 0);
          const avgValue = active.length > 0
            ? active.reduce((sum, p) => sum + (Number(p.value) || 0), 0) / active.length
            : 0;

          setStats({
            total_revenue: totalRevenue,
            active_jobs: active.length,
            new_leads: leads.length,
            avg_value: Math.round(avgValue),
          });
        }
      } catch (err) {
        console.error('Failed to fetch dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

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
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-4 p-8 text-center text-gray-500 italic">Updating Dashboard...</div>
          ) : (
            <>
              <div className="card p-5">
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${stats.total_revenue.toLocaleString()}</p>
              </div>
              <div className="card p-5">
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active_jobs}</p>
              </div>
              <div className="card p-5">
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">New Leads</p>
                <p className="text-2xl font-bold text-gray-900">{stats.new_leads}</p>
              </div>
              <div className="card p-5">
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Avg Job Value</p>
                <p className="text-2xl font-bold text-gray-900">${stats.avg_value.toLocaleString()}</p>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
