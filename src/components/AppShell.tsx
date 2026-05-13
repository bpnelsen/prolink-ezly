'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import { supabase } from '../lib/supabase-client'

/**
 * Wraps every route. On authenticated app routes (dashboard, settings,
 * customers, dispatch, new-job, automations, contractor), renders the
 * shared Sidebar + a mobile hamburger that opens it. On every other route
 * (login/signup, marketing, blog, public invoice & contract viewers),
 * children pass through untouched.
 */

const APP_ROUTE_PREFIXES = [
  '/dashboard',
  '/settings',
  '/customers',
  '/dispatch',
  '/new-job',
  '/automations',
  '/contractor',
]

function isAppRoute(pathname: string): boolean {
  return APP_ROUTE_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  const [open, setOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  const appRoute = isAppRoute(pathname)

  useEffect(() => {
    if (!appRoute) return
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled || !session) return
      setUserEmail(session.user.email || '')
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single()
      if (!cancelled) setUserName(prof?.full_name || '')
    })()
    return () => { cancelled = true }
  }, [appRoute])

  // Close the mobile sidebar on route change
  useEffect(() => { setOpen(false) }, [pathname])

  if (!appRoute) return <>{children}</>

  return (
    <div className="flex min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} userName={userName} userEmail={userEmail} />

      {/* Floating mobile hamburger (only when sidebar is hidden on mobile) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="md:hidden fixed top-3 left-3 z-20 p-2 rounded-lg bg-white shadow-md border border-gray-200 text-gray-700 hover:bg-gray-50"
          aria-label="Open menu">
          <Menu size={18} />
        </button>
      )}

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
