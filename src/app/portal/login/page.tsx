'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase-client'

function LoginInner() {
  const router = useRouter()
  const search = useSearchParams()
  const next = search.get('next') || '/portal'
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(next)
    })
  }, [router, next])

  const sendLink = async () => {
    const e = email.trim().toLowerCase()
    if (!e) return
    setLoading(true)
    setError(null)
    const redirectTo = `${window.location.origin}${next.startsWith('/') ? next : '/portal'}`
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true, data: { account_type: 'client' } },
    })
    if (otpErr) setError(otpErr.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Customer Portal</h1>
        <p className="text-sm text-gray-500 mb-6">
          Sign in to see your invoices, messages, and contracts in one place.
        </p>

        {sent ? (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 text-sm">
            Check your email — we sent a secure sign-in link to <strong>{email}</strong>. Open it on
            this device to continue.
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-4">
                {error}
              </div>
            )}
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendLink() }}
              placeholder="you@email.com"
              className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none mb-4"
            />
            <button
              onClick={sendLink}
              disabled={loading || !email.trim()}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm"
            >
              {loading ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            <p className="text-[11px] text-gray-400 mt-4 text-center">
              Use the email address your contractor has on file for you.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function PortalLoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}
