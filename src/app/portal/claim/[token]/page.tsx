'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase-client'
import { apiFetch } from '../../../../lib/api-fetch'

export default function PortalClaimPage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const { token } = params
  const [phase, setPhase] = useState<'checking' | 'need_login' | 'sent' | 'claiming' | 'done' | 'error'>('checking')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const claim = useCallback(async () => {
    setPhase('claiming')
    const r = await apiFetch<{ linked: boolean }>('/api/v1/portal/claim', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
    if (r.status < 400 && r.data?.linked) {
      setPhase('done')
      setTimeout(() => router.replace('/portal'), 1200)
    } else {
      setPhase('error')
      setMsg(r.message || r.error || 'Could not link your account.')
    }
  }, [token, router])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) claim()
      else setPhase('need_login')
    })
  }, [claim])

  const sendLink = async () => {
    const e = email.trim().toLowerCase()
    if (!e) return
    const redirectTo = `${window.location.origin}/portal/claim/${token}`
    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true, data: { account_type: 'client' } },
    })
    if (error) { setPhase('error'); setMsg(error.message) }
    else setPhase('sent')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md text-center">
        {phase === 'checking' || phase === 'claiming' ? (
          <>
            <div className="w-8 h-8 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">{phase === 'claiming' ? 'Linking your account…' : 'Loading…'}</p>
          </>
        ) : phase === 'done' ? (
          <>
            <p className="text-4xl mb-3">✅</p>
            <h1 className="text-lg font-bold text-gray-900">You're all set</h1>
            <p className="text-sm text-gray-500 mt-1">Taking you to your portal…</p>
          </>
        ) : phase === 'sent' ? (
          <>
            <p className="text-4xl mb-3">📧</p>
            <h1 className="text-lg font-bold text-gray-900">Check your email</h1>
            <p className="text-sm text-gray-500 mt-1">
              Open the secure link we sent to <strong>{email}</strong> on this device to finish connecting your account.
            </p>
          </>
        ) : phase === 'error' ? (
          <>
            <p className="text-4xl mb-3">⚠️</p>
            <h1 className="text-lg font-bold text-gray-900 mb-1">Something went wrong</h1>
            <p className="text-sm text-red-600">{msg}</p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-bold text-gray-900 mb-1">Connect your account</h1>
            <p className="text-sm text-gray-500 mb-5">
              Enter your email to securely access your invoices, messages, and contracts.
            </p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendLink() }}
              placeholder="you@email.com"
              className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none mb-4"
            />
            <button onClick={sendLink} disabled={!email.trim()}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm">
              Email me a secure link
            </button>
          </>
        )}
      </div>
    </div>
  )
}
