'use client'
import { useEffect, useState } from 'react'
import AIForeman from './AIForeman'
import { supabase } from '@/lib/supabase-client'

export default function ForemanWrapper() {
  const [session, setSession] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    supabase.auth.getSession().then(({ data }: any) => {
      setSession(data.session)
    })

    const sub = supabase.auth.onAuthStateChange((_event: string, data: any) => {
      setSession(data.session)
    })

    return () => {
      sub.data.subscription.unsubscribe()
    }
  }, [])

  if (!mounted || !session) return null
  return <AIForeman />
}