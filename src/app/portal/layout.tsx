'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase-client'

/**
 * Branded chrome for every /portal/* route. The navy→teal gradient header
 * matches the customer-portal invite email so the experience feels like
 * one product across email + web. Sign-out shows only when there is a
 * session, so the same chrome can wrap /portal/login and /portal/claim
 * without exposing auth controls to anon visitors.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setHasSession(!!data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session)
    })
    return () => { mounted = false; sub?.subscription?.unsubscribe?.() }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.replace('/portal/login')
  }

  const isAuthPage = pathname === '/portal/login' || pathname?.startsWith('/portal/claim')

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      <header
        className="px-5 py-4 md:px-8"
        style={{ background: 'linear-gradient(135deg, #0f3a7d 0%, #14b8a6 100%)' }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <Link href="/portal" className="flex items-center gap-2 group">
            <span className="text-xl md:text-2xl font-extrabold tracking-tight text-white">Prolink</span>
            <span className="hidden sm:inline text-[11px] font-semibold uppercase tracking-widest text-white/85">
              Customer Portal
            </span>
          </Link>
          {hasSession && !isAuthPage && (
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition"
            >
              <LogOut size={13} /> Sign out
            </button>
          )}
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="px-5 py-5 md:px-8 border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[#0f3a7d]">Prolink</p>
          <p className="text-[11px] text-gray-400">Secure customer portal · Powered by Supabase</p>
        </div>
      </footer>
    </div>
  )
}
