'use client'
import {
  LayoutDashboard, CalendarDays, Users, Briefcase,
  BarChart2, LogOut, Globe, UserCog, FileText, Shield,
  Settings, User, X,
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ADMIN_EMAIL } from '../lib/admin'
import { supabase } from '../lib/supabase-client'
import ProlinkLogo from './ProlinkLogo'

const NAV_MAIN = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Schedule', href: '/dispatch', icon: CalendarDays },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Jobs', href: '/dashboard/jobs', icon: Briefcase },
  { label: 'Invoices', href: '/dashboard/invoices', icon: FileText },
  { label: 'Contracts', href: '/dashboard/contracts', icon: FileText },
  { label: 'Team', href: '/dashboard/technicians', icon: UserCog },
]

const NAV_MARKETING = [
  { label: 'Website Builder', href: '/dashboard/website-builder', icon: Globe },
]

const NAV_GROWTH = [
  { label: 'Analytics', href: '/dashboard/kpis', icon: BarChart2 },
]

const NAV_SETTINGS = [
  { label: 'Company Profile', href: '/settings/profile', icon: User },
  { label: 'Settings', href: '/settings', icon: Settings },
]

interface Props {
  open: boolean
  onClose: () => void
  userName: string
  userEmail: string
}

export default function Sidebar({ open, onClose, userName: _userName, userEmail }: Props) {
  const pathname = usePathname() || ''
  const isActive = (href: string) => pathname === href
  const showAdmin = userEmail === ADMIN_EMAIL

  const linkCls = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
      active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
    }`

  return (
    <>
      {/* Overlay for mobile */}
      {open && <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={onClose} />}

      <aside className={`
        fixed top-0 left-0 h-full w-56 z-30 flex flex-col
        bg-[#0f1d35] transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:flex
      `}>
        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-between">
          <ProlinkLogo className="w-40 h-auto" />
          <button onClick={onClose} className="md:hidden text-white/50 hover:text-white" aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-6 overflow-y-auto">
          <Section title="Main">
            {NAV_MAIN.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link href={href} onClick={onClose} className={linkCls(isActive(href))}>
                  <Icon size={17} className={isActive(href) ? 'text-teal-400' : ''} />
                  {label}
                </Link>
              </li>
            ))}
          </Section>

          <Section title="Marketing">
            {NAV_MARKETING.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link href={href} onClick={onClose} className={linkCls(isActive(href))}>
                  <Icon size={17} className={isActive(href) ? 'text-teal-400' : ''} />
                  {label}
                </Link>
              </li>
            ))}
          </Section>

          {showAdmin && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400/80 px-2 mb-2">Admin</p>
              <ul className="space-y-0.5">
                <li>
                  <Link
                    href="/dashboard/admin"
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      pathname.startsWith('/dashboard/admin')
                        ? 'bg-purple-500/20 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}>
                    <Shield size={17} className={pathname.startsWith('/dashboard/admin') ? 'text-purple-400' : ''} />
                    Platform Admin
                  </Link>
                </li>
              </ul>
            </div>
          )}

          <Section title="Growth">
            {NAV_GROWTH.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link href={href} onClick={onClose} className={linkCls(isActive(href))}>
                  <Icon size={17} className={isActive(href) ? 'text-teal-400' : ''} />
                  {label}
                </Link>
              </li>
            ))}
          </Section>

          <Section title="Settings">
            {NAV_SETTINGS.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link href={href} onClick={onClose} className={linkCls(isActive(href))}>
                  <Icon size={17} className={isActive(href) ? 'text-teal-400' : ''} />
                  {label}
                </Link>
              </li>
            ))}
          </Section>
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-white/50 hover:text-white hover:bg-white/5 transition w-full">
            <LogOut size={17} /> Logout
          </button>
        </div>
      </aside>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-2 mb-2">{title}</p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  )
}
