'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, BarChart3, AlertTriangle } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'

export default function MarketIntelligence() {
  const [data] = useState({
    avgProjectSize: '$4,250',
    marketTrend: 'Growing (+8%)',
    priceInflator: 'Material Costs',
    segments: [
      { name: 'Home Renovation', avg: '$12,500' },
      { name: 'HVAC/Repair', avg: '$850' },
      { name: 'Electrical/Upgrade', avg: '$1,200' },
      { name: 'Roofing/Replacement', avg: '$9,800' },
    ],
    pipelineValue: '$84,200',
    activeLeads: 12,
    projectTypes: [
       'Full Kitchen Remodel', 
       'Bathroom Vanity Install', 
       'Roof Leak Repair', 
       'Service Panel Upgrade', 
       'HVAC System Replacement'
    ]
  })

  return (
    <div className="p-6 md:p-8 space-y-8">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Market Intelligence', href: '/dashboard/market-intelligence' }]} />
      <h1 className="text-2xl font-bold text-gray-900">Market Intelligence</h1>

      {/* Pricing Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-5 border-l-4 border-teal-500">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg. Project</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.avgProjectSize}</p>
        </div>
        <div className="card p-5 border-l-4 border-blue-500">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pipeline Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.pipelineValue}</p>
        </div>
        <div className="card p-5 border-l-4 border-purple-500">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Leads</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.activeLeads}</p>
        </div>
        <div className="card p-5 border-l-4 border-amber-500">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trend</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.marketTrend}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Segment Breakdown */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-4">Pricing by Segment</h2>
          <div className="space-y-4">
            {data.segments.map((seg, i) => (
              <div key={i} className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-gray-700 text-sm">{seg.name}</span>
                <span className="font-bold text-gray-900 text-sm">{seg.avg}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Project Types */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-4">Common Project Inquiries</h2>
          <div className="space-y-3">
            {data.projectTypes.map((type, i) => (
              <div key={i} className="flex items-center gap-3 text-sm p-3 bg-gray-50 rounded-lg text-gray-700">
                <span className="w-6 h-6 flex items-center justify-center bg-teal-100 text-teal-700 rounded-full text-xs font-bold">{i + 1}</span>
                {type}
              </div>
            ))}
          </div>
        </div>
      </div>

      
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-amber-800 text-sm">
        <AlertTriangle className="shrink-0" />
        <p><strong>Note:</strong> Pricing data is currently synthesized based on market benchmarks. We are connecting live data feeds to show actual local pricing trends soon.</p>
      </div>
    </div>
  )
}
