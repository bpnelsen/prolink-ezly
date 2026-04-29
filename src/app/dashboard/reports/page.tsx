'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, DollarSign, Users, ArrowUpRight } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import Link from 'next/link'

export default function Reports() {
  const [stats] = useState([
    { label: 'Total Revenue', value: '$124,500', change: '+12.5%', icon: DollarSign, color: 'text-emerald-600' },
    { label: 'Active Jobs', value: '48', change: '+3.2%', icon: BarChart3, color: 'text-blue-600' },
    { label: 'New Leads', value: '89', change: '+15.1%', icon: Users, color: 'text-purple-600' },
    { label: 'Avg Job Value', value: '$2,593', change: '-2.1%', icon: TrendingUp, color: 'text-orange-600' },
  ])

  return (
    <div className="p-6 md:p-8">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reports', href: '/dashboard/reports' }]} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports & KPIs</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <stat.icon size={18} className={stat.color} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-[10px] font-bold text-emerald-600 flex items-center mt-1">
              <ArrowUpRight size={12} className="mr-1" /> {stat.change}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-8 card p-6">
        <h2 className="font-bold text-gray-900 mb-4">Performance Trends</h2>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-lg text-gray-400">
          Chart Placeholder: Monthly Revenue Growth
        </div>
      </div>
    </div>
  )
}
