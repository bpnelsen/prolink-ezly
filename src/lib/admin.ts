import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase-client'

export const ADMIN_EMAIL = 'bpnelsen@gmail.com'

export function useIsAdmin(redirectIfNot = true) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        if (redirectIfNot) router.push('/login')
        setIsAdmin(false)
        return
      }
      const userEmail = session.user.email || null
      setEmail(userEmail)
      const admin = userEmail === ADMIN_EMAIL
      setIsAdmin(admin)
      if (!admin && redirectIfNot) router.push('/dashboard')
    }
    check()
  }, [router, redirectIfNot])

  return { isAdmin, email, loading: isAdmin === null }
}
