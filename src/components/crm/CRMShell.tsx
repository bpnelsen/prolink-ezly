'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Users, KanbanSquare, ClipboardList, Upload,
  LogOut, Menu, X, Search,
} from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { ADMIN_EMAIL } from '@/lib/admin'
import ProlinkLogo from '../ProlinkLogo'

const NAV = [
  { label: 'Dashboard', href: '/crm', icon: LayoutDashboard, exact: true },
  { label: 'Contractors', href: '/crm/contractors', icon: Users },
  { label: 'Pipeline', href: '/crm/pipeline', icon: KanbanSquare },
  { label: 'Activities', href: '/crm/activities', icon: ClipboardList },
  { label: 'Import', href: '/crm/import', icon: Upload },
]

export default function CRMShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() || ''
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  // The CRM login page lives under /crm so it inherits this layout — but it
  // has its own chrome and obviously must NOT be auth-gated by the shell.
  const isPublicCrmRoute = pathname === '/crm/login' || pathname.startsWith('/crm/login/')

  useEffect(() => {
    if (isPublicCrmRoute) { setChecked(true); return }
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session) {
        const next = encodeURIComponent(pathname || '/crm')
        router.replace(`/crm/login?next=${next}`)
        return
      }
      const userEmail = session.user.email || ''
      setEmail(userEmail)
      setChecked(true)
    })()
    return () => { cancelled = true }
  }, [router, pathname, isPublicCrmRoute])

  useEffect(() => { setOpen(false) }, [pathname])

  if (isPublicCrmRoute) return <>{children}</>

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    )
  }

  if (email && email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-bold text-gray-900">Access restricted</h1>
          <p className="text-sm text-gray-600">
            The Prolink Sales CRM is only available to authorized admins. You're
            signed in as <span className="font-semibold">{email}</span>.
          </p>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.replace('/crm/login') }}
            className="text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            Sign out and try a different account →
          </button>
        </div>
      </div>
    )
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="flex min-h-screen bg-gray-50">
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 h-screen w-60 z-30 flex flex-col shrink-0
        bg-[#0f1d35] transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:sticky md:top-0 md:flex
      `}>
        <div className="px-5 py-5 flex items-center justify-between">
          <Link href="/crm" className="flex items-center gap-2">
            <ProlinkLogo className="w-32 h-auto" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-300/90">CRM</span>
          </Link>
          <button onClick={() => setOpen(false)} className="md:hidden text-white/50 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ label, href, icon: Icon, exact }) => {
            const active = isActive(href, exact)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={17} className={active ? 'text-teal-400' : ''} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Signed in</p>
            <p className="text-xs text-white/70 truncate">{email}</p>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.replace('/crm/login') }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-white/50 hover:text-white hover:bg-white/5 transition w-full"
          >
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
          <button onClick={() => setOpen(true)} className="text-gray-700"><Menu size={20} /></button>
          <span className="font-bold text-gray-900">Prolink CRM</span>
          <div className="w-5" />
        </header>
        <main className="px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  )
}

export function GlobalSearch({ onSubmit, initial = '' }: { onSubmit: (q: string) => void; initial?: string }) {
  const [q, setQ] = useState(initial)
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(q.trim()) }}
      className="relative w-full md:max-w-sm"
    >
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by business name…"
        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
      />
    </form>
  )
}
