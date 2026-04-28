'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'

export default function Home() {
  return (
    <div style={{ width: '100%', minHeight: '100vh' }}>
      {/* Google consent verification needs an accessible link to Privacy/Terms and visible app name */}
      <div className="w-full bg-white border-b border-gray-100 py-3 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-sm font-bold text-[#0f3a7d]">Prolink</div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-sm text-gray-500 hover:text-[#0f3a7d] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-sm text-gray-500 hover:text-[#0f3a7d] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>

      <iframe
        src="/ezly-marketing.html"
        title="Prolink Marketing Site"
        style={{ width: '100%', height: 'calc(100vh - 58px)', border: 0, display: 'block' }}
      />
    </div>
  )
}
