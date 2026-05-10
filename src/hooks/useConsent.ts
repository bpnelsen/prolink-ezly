'use client'

import { useContext } from 'react'
import { ConsentContext } from '@/components/consent/ConsentProvider'

export function useConsent() {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error('useConsent must be used within ConsentProvider')
  return ctx
}
