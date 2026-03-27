'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Contractor page now redirects to dashboard — Prolink IS the contractor's app
export default function ContractorRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard')
  }, [router])
  return null
}
