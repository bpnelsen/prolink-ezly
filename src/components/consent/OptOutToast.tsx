'use client'

import { useEffect } from 'react'
import { useConsent } from '@/hooks/useConsent'

export function OptOutToast() {
  const { optOutToastVisible, dismissOptOutToast } = useConsent()

  useEffect(() => {
    if (!optOutToastVisible) return
    const t = setTimeout(dismissOptOutToast, 6000)
    return () => clearTimeout(t)
  }, [optOutToastVisible, dismissOptOutToast])

  if (!optOutToastVisible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] max-w-sm rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-xl motion-safe:animate-[fadeIn_200ms_ease-out]"
    >
      <p className="font-semibold">Opt-out honored</p>
      <p className="mt-1 text-gray-200">
        We detected a Global Privacy Control signal and applied your opt-out preference.
      </p>
      <button
        type="button"
        onClick={dismissOptOutToast}
        className="mt-2 text-xs underline hover:no-underline"
      >
        Dismiss
      </button>
    </div>
  )
}
