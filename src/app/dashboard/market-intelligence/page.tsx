'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, BarChart3, AlertTriangle } from 'lucide-react'

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
    ]
  })

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Market Intelligence</h1>

      {/* Pricing Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-5 border-l-4 border-teal-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Avg. Project Size</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{data.avgProjectSize}</p>
        </div>
        <div className="card p-5 border-l-4 border-blue-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Current Market Trend</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{data.marketTrend}</p>
        </div>
        <div className="card p-5 border-l-4 border-amber-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Primary Driver</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{data.priceInflator}</p>
        </div>
      </div>

      {/* Segment Breakdown */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-4">Pricing Breakdown by Segment</h2>
        <div className="space-y-4">
          {data.segments.map((seg, i) => (
            <div key={i} className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="text-gray-700 font-medium">{seg.name}</span>
              <span className="font-bold text-gray-900">{seg.avg}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-amber-800 text-sm">
        <AlertTriangle className="shrink-0" />
        <p><strong>Note:</strong> Pricing data is currently synthesized based on market benchmarks. We are connecting live data feeds to show actual local pricing trends soon.</p>
      </div>
    </div>
  )
}
