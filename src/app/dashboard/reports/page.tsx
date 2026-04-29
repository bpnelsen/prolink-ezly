'use client'

import { BarChart3, TrendingUp, DollarSign, Users, ArrowUpRight, ArrowDownRight, Zap, Calendar } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'

export default function Reports() {
  const stats = [
    { label: 'Total Revenue', value: '$124,500', change: '+12.5%', icon: DollarSign, color: 'teal' },
    { label: 'Active Jobs', value: '48', change: '+3.2%', icon: BarChart3, color: 'blue' },
    { label: 'New Leads', value: '89', change: '+15.1%', icon: Users, color: 'purple' },
    { label: 'Avg Job Value', value: '$2,593', change: '-2.1%', icon: TrendingUp, color: 'amber' },
  ]

  const chartData = [
    { month: 'Jan', revenue: 8200 },
    { month: 'Feb', revenue: 9400 },
    { month: 'Mar', revenue: 11200 },
    { month: 'Apr', revenue: 10800 },
    { month: 'May', revenue: 13100 },
    { month: 'Jun', revenue: 14800 },
  ]
  const maxRevenue = Math.max(...chartData.map(d => d.revenue))

  const colorMap: Record<string, { text: string; icon: string }> = {
    teal: { text: 'text-teal-600', icon: 'bg-teal-100 text-teal-600' },
    blue: { text: 'text-blue-600', icon: 'bg-blue-100 text-blue-600' },
    purple: { text: 'text-purple-600', icon: 'bg-purple-100 text-purple-600' },
    amber: { text: 'text-amber-600', icon: 'bg-amber-100 text-amber-600' },
  }

  return (
    <div className="p-6 md:p-8 page-enter">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reports', href: '/dashboard/reports' }]} />

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Reports & KPIs</h1>
          <p className="text-sm text-gray-500 mt-1">Your business metrics at a glance</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Calendar size={13} />
          <span>Updated just now</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((stat, i) => {
          const c = colorMap[stat.color]
          return (
            <div key={i} className="card p-5 hover-lift">
              <div className="flex items-start justify-between mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-opacity-20" style={{ backgroundColor: `${stat.color === 'teal' ? '#f0fdfa' : stat.color === 'blue' ? '#eff6ff' : stat.color === 'purple' ? '#f5f3ff' : '#fffbeb'}` }}>
                  <stat.icon size={18} className={c.text} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 mb-2">{stat.value}</p>
              <div className={`flex items-center gap-1 text-xs font-bold ${stat.change.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>
                {stat.change.startsWith('+') ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                <span>{stat.change} vs last month</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Chart card */}
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Revenue Trend</h2>
            <p className="text-xs text-gray-400 mt-0.5">Monthly revenue over last 6 months</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />+19.5% YoY
          </span>
        </div>

        {/* Custom bar chart */}
        <div className="flex items-end gap-4 h-52">
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-gray-500">${(d.revenue / 1000).toFixed(1)}k</span>
              <div
                className="w-full rounded-t-xl transition-all hover:opacity-80 cursor-pointer group relative"
                style={{
                  height: `${(d.revenue / maxRevenue) * 160}px`,
                  background: i === chartData.length - 1
                    ? 'linear-gradient(180deg, #14b8a6 0%, #0d9e8c 100%)'
                    : 'linear-gradient(180deg, #0f3a7d88 0%, #0f3a7d44 100%)',
                }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  ${d.revenue.toLocaleString()}
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-400">{d.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Zap size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Conversion Rate</p>
              <p className="text-xl font-extrabold text-gray-900">34.8%</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: '34.8%' }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">Leads → Active Jobs</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <TrendingUp size={18} className="text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Avg. Job Size</p>
              <p className="text-xl font-extrabold text-gray-900">$2,593</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-teal-400 h-1.5 rounded-full" style={{ width: '58%' }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">+8% vs last quarter</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Repeat Customers</p>
              <p className="text-xl font-extrabold text-gray-900">22%</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: '22%' }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">3 in last 90 days</p>
        </div>
      </div>
    </div>
  )
}