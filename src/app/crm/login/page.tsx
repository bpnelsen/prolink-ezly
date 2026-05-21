'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { ADMIN_EMAIL } from '@/lib/admin'
import { KanbanSquare, ShieldCheck, TrendingUp } from 'lucide-react'
import ProlinkLogo from '@/components/ProlinkLogo'

export const dynamic = 'force-dynamic'

export default function CRMLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bootstrapping, setBootstrapping] = useState(true)

  // If already signed in as admin, jump straight to the dashboard.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      const userEmail = session?.user?.email?.toLowerCase() || ''
      if (session && userEmail === ADMIN_EMAIL.toLowerCase()) {
        router.replace(readNext() || preferredHome())
        return
      }
      setBootstrapping(false)
    })()
    return () => { cancelled = true }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const userEmail = data.user?.email?.toLowerCase() || ''
      if (userEmail !== ADMIN_EMAIL.toLowerCase()) {
        await supabase.auth.signOut()
        throw new Error('This account is not authorized for the Sales CRM.')
      }
      router.replace(readNext() || preferredHome())
    } catch (err: any) {
      setError(err?.message || 'Sign-in failed')
      setLoading(false)
    }
  }

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f1d35] flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <ProlinkLogo className="w-44 h-auto" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-teal-300/90 border border-teal-300/40 rounded px-2 py-0.5">
            Sales CRM
          </span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Move every lead<br />through the pipeline.
          </h1>
          <p className="text-white/70 text-lg mb-10">
            Internal Prolink sales console — manage imported contractors, track
            outreach, and close deals.
          </p>

          <ul className="space-y-3">
            {[
              { icon: <KanbanSquare size={14} />, text: 'Drag-and-drop pipeline across 7 stages' },
              { icon: <TrendingUp size={14} />,   text: 'Per-contractor activity timeline + tasks' },
              { icon: <ShieldCheck size={14} />,  text: 'Restricted to authorized admins' },
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-white/80 text-sm">
                <span className="w-7 h-7 rounded-md bg-teal-500/15 text-teal-300 flex items-center justify-center">
                  {f.icon}
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-white/40 text-xs">
          © {new Date().getFullYear()} Prolink by EZLY. Internal use only.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <ProlinkLogo className="w-32 h-auto" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700 border border-teal-300 rounded px-2 py-0.5">
              Sales CRM
            </span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Sign in to the Sales CRM</h2>
          <p className="text-sm text-gray-500 mt-1 mb-8">
            Internal access only. Use your admin Prolink account.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Email">
              <input
                type="email" required autoFocus autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@useezly.com"
              />
            </Field>

            <Field label="Password">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className={inputCls + ' pr-16'}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-500 hover:text-gray-800"
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm px-4 py-2.5 rounded-lg transition shadow-sm"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="text-center text-[11px] text-gray-400 pt-4">
              Lost access? Contact bpnelsen@gmail.com
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function readNext(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = new URLSearchParams(window.location.search).get('next')
    // Open-redirect guard: only same-origin relative paths.
    if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw
  } catch {}
  return null
}

// On the CRM subdomain the middleware rewrites "/" → "/crm" transparently,
// so landing on "/" keeps the URL bar clean. Anywhere else (e.g. someone
// hit /crm/login on app.useezly.com), the explicit /crm path is needed.
function preferredHome(): string {
  if (typeof window === 'undefined') return '/crm'
  return window.location.hostname === 'crm.useezly.com' ? '/' : '/crm'
}

const inputCls =
  'w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-1.5">{label}</span>
      {children}
    </label>
  )
}
