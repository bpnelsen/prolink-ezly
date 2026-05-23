'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import AIForeman from './AIForeman'
import { supabase } from '@/lib/supabase-client'

export default function ForemanWrapper() {
  const pathname = usePathname() || ''
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current session immediately
    supabase.auth.getSession().then((result: any) => {
      setSession(result.data.session)
      setLoading(false)
    })

    // Listen for auth changes — second arg IS the session (Session | null)
    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setSession(session)
      setLoading(false)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  // Don't show until we've confirmed session status
  if (loading) return null
  if (!session) return null
  // The AI Foreman is a contractor-app assistant; hide it on the sales CRM.
  if (pathname.startsWith('/crm')) return null

  return <AIForeman />
}