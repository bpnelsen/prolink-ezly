'use client'
import { useState, useEffect } from 'react';
import { Plus, LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase-client';

const handleLogout = () => {
  localStorage.clear()
  window.location.href = '/login'
}

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Ensure contractor record exists on load (handles immediate-login signup path where callback is skipped)
  useEffect(() => {
    const bootstrap = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: existing } = await supabase.from('pl_contractors').select('id').eq('id', user.id).single()
      if (!existing) {
        await supabase.from('profiles').upsert({ id: user.id })
        await supabase.from('pl_contractors').upsert({ id: user.id })
      }
    }
    bootstrap()
  }, [])

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
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Prolink</h1>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex gap-6 items-center">
            {navLinks.map(link => (
              <Link key={link.name} href={link.href} className="text-sm font-semibold text-gray-600 hover:text-teal-600">{link.name}</Link>
            ))}
            <Link href="/new-job" className="bg-teal-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-teal-700 shadow-sm">+ New Job</Link>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-600" title="Logout">
              <LogOut size={18} />
            </button>
          </div>

          {/* Mobile Toggle */}
          <div className="md:hidden flex items-center gap-3">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-gray-700">
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
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
        {/* KPI Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           {/* ... existing KPIs content ... */}
           <div className="card p-5">
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">$24,850</p>
           </div>
           <div className="card p-5">
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Active Jobs</p>
              <p className="text-2xl font-bold text-gray-900">48</p>
           </div>
           <div className="card p-5">
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">New Leads</p>
              <p className="text-2xl font-bold text-gray-900">89</p>
           </div>
           <div className="card p-5">
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Avg Value</p>
              <p className="text-2xl font-bold text-gray-900">$2,593</p>
           </div>
        </section>

        {/* Today's Schedule */}
        <section className="card p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Today's Schedule</h3>
          <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
            {/* ... schedule items ... */}
             <div className="p-3 text-sm text-gray-600">8:00 AM - Kitchen Remodel</div>
             <div className="p-3 text-sm text-gray-600">10:30 AM - Bathroom Fix</div>
          </div>
        </section>

      </main>
    </div>
  )
}
