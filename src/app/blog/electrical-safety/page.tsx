'use client'

import { MarketingFooter } from '@/components/marketing/MarketingFooter'

export default function ElectricalSafety() {
  return (
    <>
      <main className="max-w-3xl mx-auto px-6 py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-6">
        <ol className="flex items-center gap-2">
          <li><a href="/" className="text-[#0f3a7d] hover:underline">Home</a></li>
          <li aria-hidden="true">/</li>
          <li><a href="/blog" className="text-[#0f3a7d] hover:underline">Blog</a></li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-700 line-clamp-1" aria-current="page">Electrical Upgrades that Sell</li>
        </ol>
      </nav>
      <img src="/blog/electrical-safety.jpg" alt="" className="w-full rounded-2xl mb-8 object-cover" style={{ height:"320px", width:"100%" }} />
      <h1 className="text-3xl font-black text-[#0f3a7d] mb-4">Electrical Upgrades that Sell</h1>
      <p className="text-gray-500 mb-8">Increase order value and customer satisfaction with smart electrical add-ons.</p>
      <div className="prose prose-teal max-w-none text-gray-700">
        <p>Your electrical services shouldn't just be about repairs; they should be about home modernization.</p>
        <h2 className="text-xl font-bold mt-6 mb-2">Retrofitting Smart Lighting</h2>
        <p>Offer smart switch installations and modern lighting controls to homeowners looking to bring older homes into the tech age.</p>
        <h2 className="text-xl font-bold mt-6 mb-2">EV Charger Ready</h2>
        <p>Pre-quoting for EV-dedicated circuits is a high-value upsell for single-family home customers.</p>
        <h2 className="text-xl font-bold mt-6 mb-2">Safety Inspections</h2>
        <p>Add a formal safety sweep (checking breakers, grounding, and GFCI) as a line item to every electrical work order.</p>
      </div>
    </main>
      <MarketingFooter />
    </>
  )
}