'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, AlertCircle, Banknote, ExternalLink, Loader2, ArrowRight, RefreshCw } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import { supabase } from '../../../lib/supabase-client'

type ConnectStatus = 'not_connected' | 'pending' | 'active'

interface StatusData {
  status: ConnectStatus
  charges_enabled?: boolean
  payouts_enabled?: boolean
  dashboard_url?: string
}

// Current calendar month payment volume for the waiver meter
interface VolumeData {
  total: number
  threshold: number
}

const THRESHOLD = 3500

export default function PayoutsPage() {
  const searchParams = useSearchParams()
  const [statusData, setStatusData] = useState<StatusData | null>(null)
  const [volume, setVolume] = useState<VolumeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const fetchStatus = useCallback(async (token: string) => {
    const res = await fetch('/api/stripe/connect/status', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setStatusData(data)
    return data
  }, [])

  const fetchVolume = useCallback(async (userId: string) => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

    const { data } = await supabase
      .from('payments')
      .select('amount')
      .eq('contractor_id', userId)
      .gte('paid_at', monthStart)
      .lte('paid_at', monthEnd)

    const total = (data || []).reduce((sum, p) => sum + Number(p.amount), 0)
    setVolume({ total, threshold: THRESHOLD })
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const returnedSuccess = searchParams.get('success') === 'true'
      const needsRefresh = searchParams.get('refresh') === 'true'

      if (returnedSuccess) {
        setMsg({ type: 'info', text: 'Setup received — Stripe is verifying your account. This may take a few minutes.' })
      }
      if (needsRefresh) {
        setMsg({ type: 'info', text: 'Your session expired. Click below to continue setup.' })
      }

      await Promise.all([
        fetchStatus(session.access_token),
        fetchVolume(session.user.id),
      ])
      setLoading(false)
    }
    load()
  }, [searchParams, fetchStatus, fetchVolume])

  const handleConnect = async () => {
    setConnecting(true)
    setMsg(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/stripe/connect/onboard', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setMsg({ type: 'error', text: data.error || 'Failed to start setup. Please try again.' })
      setConnecting(false)
    }
  }

  const handleRefreshStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setLoading(true)
    await fetchStatus(session.access_token)
    setLoading(false)
  }

  const pct = volume ? Math.min(100, (volume.total / THRESHOLD) * 100) : 0
  const waiverEarned = (volume?.total ?? 0) >= THRESHOLD

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  const status = statusData?.status ?? 'not_connected'

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[
        { label: 'Settings', href: '/settings' },
        { label: 'Payouts / Stripe Connect', href: '/settings/payouts' },
      ]} />
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Payments</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Payouts / Stripe Connect</h2>

        {msg && (
          <div className={`mb-5 flex items-start gap-2 p-4 rounded-xl border text-sm ${
            msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700'
            : msg.type === 'error' ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-blue-50 border-blue-100 text-blue-700'
          }`}>
            {msg.type === 'success' ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
            {msg.text}
          </div>
        )}

        {/* Connect status card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-teal-400">
              <Banknote size={18} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Stripe Connect</p>
              <p className="text-xs text-gray-500">Accept card, bank transfer, and financing from customers</p>
            </div>
          </div>

          {status === 'not_connected' && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Connect a bank account via Stripe to enable the <strong>Pay Online</strong> button on your invoices.
                Prolink charges a <strong>3% platform fee</strong> per transaction. Stripe&apos;s standard processing
                fees (2.9% + 30¢) apply separately.
              </p>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition"
              >
                {connecting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                {connecting ? 'Redirecting to Stripe...' : 'Connect Stripe Account'}
              </button>
            </>
          )}

          {status === 'pending' && (
            <>
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle size={14} className="text-amber-500 shrink-0" />
                <p className="text-sm text-amber-700 font-semibold">Setup incomplete — Stripe is waiting for more information</p>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Your account has been created but isn&apos;t verified yet. Complete setup to start accepting payments.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition"
                >
                  {connecting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  {connecting ? 'Redirecting...' : 'Complete Setup'}
                </button>
                <button onClick={handleRefreshStatus} className="flex items-center gap-2 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                  <RefreshCw size={13} /> Refresh Status
                </button>
              </div>
            </>
          )}

          {status === 'active' && (
            <>
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                <p className="text-sm text-green-700 font-semibold">Connected — accepting online payments</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Card payments</p>
                  <p className="font-bold text-gray-800">{statusData?.charges_enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Payouts</p>
                  <p className="font-bold text-gray-800">{statusData?.payouts_enabled ? 'Enabled (2-day)' : 'Pending'}</p>
                </div>
              </div>
              {statusData?.dashboard_url && (
                <a
                  href={statusData.dashboard_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
                >
                  <ExternalLink size={13} /> View Stripe Dashboard
                </a>
              )}
            </>
          )}
        </div>

        {/* Volume waiver meter */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="font-bold text-gray-900 text-sm mb-1">Monthly Subscription Waiver</p>
          <p className="text-xs text-gray-500 mb-4">
            Process <strong>$3,500</strong> in customer payments in a calendar month and your Prolink subscription is free for that month.
          </p>

          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-gray-700">${(volume?.total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} processed</span>
            <span className={waiverEarned ? 'text-teal-600' : 'text-gray-400'}>${THRESHOLD.toLocaleString()} goal</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${waiverEarned ? 'bg-teal-500' : 'bg-teal-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {waiverEarned ? (
            <p className="mt-2 text-xs font-bold text-teal-600 flex items-center gap-1">
              <CheckCircle2 size={12} /> Waiver earned — your subscription this month is free!
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-500">
              ${(THRESHOLD - (volume?.total ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })} more to unlock your free month
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
