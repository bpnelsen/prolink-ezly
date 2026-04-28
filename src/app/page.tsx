'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'

export default function Home() {
  return (
    <div style={{ width: '100%', minHeight: '100vh' }}>
      <iframe
        src="/ezly-marketing.html"
        title="Prolink Marketing Site"
        style={{ width: '100%', height: '100vh', border: 0, display: 'block' }}
      />
    </div>
  )
}
