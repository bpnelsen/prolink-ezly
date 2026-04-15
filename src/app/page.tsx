'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomeRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    // Basic auth check from local storage (or whatever you use for your session state)
    const isAuthenticated = localStorage.getItem('authenticated') === 'true'
    
    if (isAuthenticated) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-sm font-semibold text-gray-500">Redirecting...</div>
    </div>
  )
}
