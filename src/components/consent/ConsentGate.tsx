'use client'

import { useConsent } from '@/hooks/useConsent'
import type { Category } from '@/lib/consent/types'

export function ConsentGate({ category, children }: { category: Exclude<Category, 'necessary'>; children: React.ReactNode }) {
  const { consent, hasDecided } = useConsent()
  if (!hasDecided) return null
  if (!consent[category]) return null
  return <>{children}</>
}
