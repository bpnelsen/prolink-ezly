'use client'
import { Plus, Search, Calendar, Users, Briefcase, TrendingUp, AlertTriangle, FileText, CheckCircle, BarChart3, Tag, Clock, MapPin, User, ArrowUpRight, DollarSign, Send, Check, LogOut } from 'lucide-react';
import Link from 'next/link';

const handleLogout = () => {
  localStorage.clear()
  window.location.href = '/login'
}

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Prolink</h1>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex gap-6 items-center">
            <Link href="/dispatch" className="text-sm font-semibold text-gray-600 hover:text-teal-600">Schedule</Link>
            <Link href="/customers" className="text-sm font-semibold text-gray-600 hover:text-teal-600">Customers</Link>
            <Link href="/dashboard/reports" className="text-sm font-semibold text-gray-600 hover:text-teal-600">Reports</Link>
            <Link href="/settings" className="text-sm font-semibold text-gray-600 hover:text-teal-600">Settings</Link>
            <Link href="/new-job" className="bg-teal-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-teal-700 shadow-sm">+ New Job</Link>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-600" title="Logout">
              <LogOut size={18} />
            </button>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-3">
            <Link href="/new-job" className="bg-teal-600 text-white p-2 rounded-lg shadow-sm">
                <Plus size={18}/>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        
        {/* KPI Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Upcoming Jobs</p>
                <Clock size={14} className="text-teal-600" />
              </div>
              <div className="space-y-2 text-sm">
                  <p className="font-bold text-gray-900">8:00a — Kitchen Remodel</p>
                  <p className="text-gray-500">Brian Nelsen</p>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="font-bold text-gray-900">10:30a — Bathroom Fix</p>
                <p className="text-gray-500">Sarah Connor</p>
              </div>
           </div>
           <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Open Estimates</p>
                <FileText size={14} className="text-amber-500" />
              </div>
              <div className="space-y-2 text-sm">
                  <p className="font-bold text-gray-900">Bath Reno</p>
                  <p className="text-gray-500">John Smith — $4,200</p>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="font-bold text-gray-900">Deck Stain</p>
                <p className="text-gray-500">Mike Johnson — $1,850</p>
              </div>
           </div>
           <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Invoicing</p>
                <DollarSign size={14} className="text-teal-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-red-700 font-bold">$3,215</p>
                    <p className="text-[9px] uppercase font-bold text-gray-400">Due</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-900 font-bold">$10,315</p>
                    <p className="text-[9px] uppercase font-bold text-gray-400">Paid</p>
                  </div>
              </div>
           </div>
           <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Revenue This Month</p>
                <TrendingUp size={14} className="text-emerald-600" />
              </div>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-gray-900">$24,850</p>
                <div className="flex items-center text-emerald-600 text-xs font-bold mb-1">
                  <ArrowUpRight size={12} />
                  <span>12%</span>
                </div>
              </div>
              <p className="text-[9px] text-gray-400 mt-2">vs. $22,100 last month</p>
           </div>
        </section>

        {/* Today's Schedule - Compact Timeline */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-sm">Today's Schedule</h3>
            <div className="flex items-center gap-3">
              <select className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 font-medium">
                <option>All Technicians</option>
                <option>AAA Electric</option>
                <option>Reliable Plumbing</option>
                <option>Precision Roofing</option>
                <option>Quick Fix HVAC</option>
              </select>
              <Link href="/dispatch" className="text-xs font-semibold text-teal-600 hover:text-teal-700">Full Calendar →</Link>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
            {[
              { time: '8:00 AM', name: 'Brian Nelsen', job: 'Kitchen Remodel', address: '123 Main St, SLC', contractor: 'AAA Electric', status: 'In Progress' },
              { time: '10:30 AM', name: 'Sarah Connor', job: 'Bathroom Fix', address: '456 Oak Dr, SLC', contractor: 'Reliable Plumbing', status: 'Pending' },
              { time: '2:00 PM', name: 'John Smith', job: 'Deck Stain', address: '789 Pine Ct, SLC', contractor: 'Precision Roofing', status: 'Scheduled' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-3 hover:bg-white transition-colors">
                <div className="w-14 text-[11px] font-bold text-teal-600 shrink-0">{item.time}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.job} · {item.address}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] font-medium px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded-full">{item.contractor}</span>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${
                    item.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    item.status === 'Pending' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                    'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Pipeline Overview */}
          <div className="lg:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-sm">Active Jobs Pipeline</h3>
              <span className="text-[10px] text-gray-400">12 total jobs</span>
            </div>
            <div className="flex items-center gap-2">
              {[
                { stage: 'Estimate', count: 4, color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { stage: 'Schedule', count: 2, color: 'bg-purple-50 text-purple-700 border-purple-200' },
                { stage: 'Start', count: 3, color: 'bg-amber-50 text-amber-700 border-amber-200' },
                { stage: 'Invoice', count: 1, color: 'bg-orange-50 text-orange-700 border-orange-200' },
                { stage: 'Pay', count: 2, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              ].map((item) => (
                <div key={item.stage} className="flex-1 text-center">
                  <div className={`text-2xl font-bold ${item.color.replace('bg-', 'text-').split(' ')[1]} ${item.color.replace('bg-', '').split(' ')[0]}`}>
                    {item.count}
                  </div>
                  <p className="text-[10px] font-medium text-gray-500 mt-1">{item.stage}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-sm">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {[
                { icon: DollarSign, iconBg: 'bg-emerald-50 text-emerald-600', text: 'Payment received', detail: '$4,200', time: '10 min' },
                { icon: Send, iconBg: 'bg-blue-50 text-blue-600', text: 'Invoice sent to', detail: 'Brian Nelsen', time: '25 min' },
                { icon: User, iconBg: 'bg-purple-50 text-purple-600', text: 'Precision Roofing assigned', detail: '', time: '1 hr' },
                { icon: Check, iconBg: 'bg-teal-50 text-teal-600', text: 'Estimate accepted by', detail: 'John Smith', time: '2 hr' },
                { icon: Plus, iconBg: 'bg-gray-100 text-gray-600', text: 'New job created:', detail: 'Kitchen Remodel', time: '3 hr' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg ${item.iconBg}`}>
                    <item.icon size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700">
                      {item.text} <span className="font-semibold">{item.detail}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{item.time} ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Analytics Section - Reduced */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-5">
                <h3 className="font-bold text-sm text-gray-900 mb-3">Job Performance</h3>
                <div className="h-28 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 text-xs italic">
                    [Chart Placeholder]
                </div>
            </div>
            <div className="card p-5">
                <h3 className="font-bold text-sm text-gray-900 mb-3">Revenue Trend</h3>
                <div className="h-28 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 text-xs italic">
                    [Chart Placeholder]
                </div>
            </div>
            <div className="card p-5 bg-teal-50 border-teal-100 flex flex-col items-center justify-center cursor-pointer hover:bg-teal-100 transition-colors min-h-[120px]">
                <Plus className="text-teal-600" size={24} />
                <p className="font-bold mt-2 text-sm text-teal-700">Add Custom Report</p>
            </div>
        </section>
      </main>
    </div>
  );
}