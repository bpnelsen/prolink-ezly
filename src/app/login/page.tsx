'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase-client'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const msg = params.get('error')
      if (msg) setError(decodeURIComponent(msg))
    } catch {
      // ignore
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        const role = profile?.role || 'contractor'
        if (role === 'admin') router.push('/dashboard/admin')
        else router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const formFields = (
    <form onSubmit={handleLogin} className="space-y-4">
      {/* Email */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
          Email address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourcompany.com"
          required
          className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-xl focus:outline-none focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 transition text-gray-900 text-sm"
        />
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full px-4 py-3 pr-12 bg-[#f8fafc] border border-gray-200 rounded-xl focus:outline-none focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 transition text-gray-900 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Forgot password */}
      <div className="flex justify-end -mt-1">
        <Link
          href="/forgot-password"
          className="text-xs font-semibold text-[#14b8a6] hover:text-[#0d9e8c] transition"
        >
          Forgot password?
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-[#0f3a7d] hover:bg-[#0c2e5c] text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LogIn size={16} />
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )

  return (
    <>
      {/* ─── MOBILE: Clean centered card (< md) ─── */}
      <div className="md:hidden min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/">
              {/* Logo has built-in whitespace — render large and crop with negative margin */}
              <div className="overflow-hidden h-14 flex items-center justify-center">
                <img
                  src="/ezly-home-horizontal.png"
                  alt="Ezly Home Services"
                  className="w-40 -m-8 object-contain"
                />
              </div>
            </Link>
            <p className="text-sm text-gray-500 font-medium">
              Sign in to manage your business
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(15,58,125,0.10)]">
            {/* Gradient accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-[#0f3a7d] to-[#14b8a6]" />
            <div className="p-8">
              {formFields}
              <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col gap-2.5 items-center">
                <p className="text-sm text-gray-500">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/signup"
                    className="text-[#14b8a6] hover:text-[#0d9e8c] font-bold transition"
                  >
                    Create Account
                  </Link>
                </p>
                <Link
                  href="/"
                  className="text-xs text-gray-400 hover:text-gray-600 transition whitespace-nowrap"
                >
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── DESKTOP: Split panel (≥ md) ─── */}
      <div className="hidden md:flex min-h-screen bg-[#e8edf5] items-center justify-center p-6">
        <div className="flex w-full max-w-4xl rounded-3xl overflow-hidden shadow-[0_12px_56px_rgba(15,58,125,0.18)] min-h-[520px]">

          {/* Left brand panel */}
          <div className="relative w-80 bg-[#0f3a7d] flex flex-col items-start justify-center px-10 py-12 shrink-0 overflow-hidden">
            {/* Decorative orbs */}
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#14b8a6]/15 pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-white/[0.04] pointer-events-none" />

            <div className="relative z-10">
              <Link href="/">
                <div className="overflow-hidden h-14 flex items-center">
                  <img
                    src="/ezly-home-horizontal.png"
                    alt="Ezly Home Services"
                    className="w-40 -m-8 object-contain brightness-0 invert"
                  />
                </div>
              </Link>
              <p className="text-white/60 text-sm leading-relaxed mb-10">
                The smart way to manage your contracting business
              </p>

              <div className="flex flex-col gap-3.5">
                {[
                  { emoji: '📋', label: 'Invoicing & estimates' },
                  { emoji: '📅', label: 'Job scheduling' },
                  { emoji: '👥', label: 'Client management' },
                ].map(({ emoji, label }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#14b8a6]/20 border border-[#14b8a6]/30 flex items-center justify-center text-sm shrink-0">
                      {emoji}
                    </div>
                    <span className="text-white/75 text-sm font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right form panel */}
          <div className="flex-1 bg-white flex flex-col justify-center px-12 py-14">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
            <p className="text-sm text-gray-500 mb-8">Sign in to your account to continue</p>

            <div className="max-w-sm">
              {formFields}
              <div className="mt-7 pt-5 border-t border-gray-100 flex flex-col gap-2.5">
                <p className="text-sm text-gray-500">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/signup"
                    className="text-[#14b8a6] hover:text-[#0d9e8c] font-bold transition"
                  >
                    Create Account
                  </Link>
                </p>
                <Link
                  href="/"
                  className="text-xs text-gray-400 hover:text-gray-600 transition whitespace-nowrap"
                >
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
