'use client'

import { useConsent } from '@/hooks/useConsent'

export function DoNotSellLink({ className }: { className?: string }) {
  const { regime, rejectAll } = useConsent()
  if (regime !== 'ccpa') return null
  return (
    <button
      type="button"
      onClick={rejectAll}
      className={className ?? 'text-sm font-medium text-[#0f3a7d] underline hover:no-underline'}
    >
      Do Not Sell or Share My Personal Information
    </button>
  )
}
