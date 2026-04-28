'use client'

import { Construction } from 'lucide-react'

export default function MarketIntelligence() {
  return (
    <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-6">
        <Construction size={32} className="text-teal-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Market Intelligence</h1>
      <p className="text-gray-500 max-w-sm">
        We're building powerful insights to help you track market trends and competitor activity. This feature is coming soon!
      </p>
    </div>
  )
}
