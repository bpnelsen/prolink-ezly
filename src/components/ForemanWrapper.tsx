'use client'
import { useEffect, useState } from 'react'
import AIForeman from './AIForeman'
import { supabase } from '@/lib/supabase-client'

export default function ForemanWrapper() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current session immediately
    supabase.auth.getSession().then((result: any) => {
      setSession(result.data.session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, data: any) => {
      setSession(data.session)
      setLoading(false)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  // Don't show until we've confirmed session status
  if (loading) return null
  if (!session) return null

  return <AIForeman />
}