'use client'
import { useEffect, useState } from 'react'
import AIForeman from './AIForeman'
import { supabase } from '@/lib/supabase-client'

export default function ForemanWrapper() {
  const [session, setSession] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, data) => {
      setSession(data.session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (!mounted || !session) return null
  return <AIForeman />
}