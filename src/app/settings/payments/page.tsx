'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  CreditCard,
  Loader2,
  Banknote,
  ShieldCheck,
} from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import { apiFetch } from '../../../lib/api-fetch'

type Status = {
  connected: boolean
  configured: boolean
  account_id?: string
  charges_enabled?: boolean
  payouts_enabled?: boolean
  details_submitted?: boolean
  requirements?: {
    currently_due: string[]
    past_due: string[]
    disabled_reason?: string | null
  }
}

export default function PaymentsSettingsPage() {
  const params = useSearchParams()
  const justOnboarded = params.get('onboarded') === '1'
  const refreshFlag = params.get('refresh') === '1'

  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'connect' | 'continue' | 'dashboard' | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function loadStatus() {
    setLoading(true)
    const res = await apiFetch<Status>('/api/stripe/connect/status')
    if (res.status === 501 && res.error === 'stripe_not_configured') {
      setStatus({ connected: false, configured: false })
    } else if (res.data) {
      setStatus(res.data)
    } else {
      setErr(res.message || 'Could not load Stripe status.')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadStatus()
  }, [])

  async function startOnboarding(kind: 'connect' | 'continue') {
    setBusy(kind)
    setErr(null)
    const res = await apiFetch<{ url: string }>('/api/stripe/connect/onboard', { method: 'POST' })
    if (res.data?.url) {
      window.location.href = res.data.url
      return
    }
    setErr(res.message || 'Could not start onboarding.')
    setBusy(null)
  }

  async function openDashboard() {
    setBusy('dashboard')
    setErr(null)
    const res = await apiFetch<{ url: string }>('/api/stripe/connect/login-link', { method: 'POST' })
    if (res.data?.url) {
      window.open(res.data.url, '_blank', 'noopener,noreferrer')
    } else {
      setErr(res.message || 'Could not open Stripe dashboard.')
    }
    setBusy(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  const fullyEnabled = status?.connected && status?.charges_enabled && status?.payouts_enabled
  const onboardingIncomplete = status?.connected && (!status.charges_enabled || !status.details_submitted)

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[
        { label: 'Settings', href: '/settings' },
        { label: 'Payments & Payouts', href: '/settings/payments' },
      ]} />
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Account</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payments &amp; Payouts</h2>
        <p className="text-sm text-gray-500 mb-6">
          Accept card and digital-wallet payments from your customers. Funds are deposited
          to your bank account via Stripe — Prolink never holds your money.
        </p>

        {justOnboarded && (
          <div className="mb-5 flex items-center gap-2 p-4 rounded-xl border bg-green-50 border-green-200 text-green-700 text-sm font-semibold">
            <CheckCircle2 size={15} />
            Onboarding submitted — Stripe is reviewing your details.
          </div>
        )}
        {refreshFlag && (
          <div className="mb-5 flex items-center gap-2 p-4 rounded-xl border bg-amber-50 border-amber-200 text-amber-700 text-sm font-semibold">
            <AlertCircle size={15} />
            Your onboarding link expired. Click "Continue onboarding" below to resume.
          </div>
        )}
        {err && (
          <div className="mb-5 flex items-center gap-2 p-4 rounded-xl border bg-red-50 border-red-200 text-red-700 text-sm font-semibold">
            <AlertCircle size={15} /> {err}
          </div>
        )}

        {!status?.configured && (
          <div className="mb-5 p-4 rounded-xl border bg-amber-50 border-amber-200 text-amber-800 text-sm">
            <p className="font-semibold mb-1">Stripe is not configured on this server yet.</p>
            <p className="text-xs">An admin needs to set <code className="bg-amber-100 px-1 rounded">STRIPE_SECRET_KEY</code> and webhook secrets in the environment before contractors can connect.</p>
          </div>
        )}

        {/* Status card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              fullyEnabled ? 'bg-green-100 text-green-600' : status?.connected ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <CreditCard size={18} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Stripe account</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">
                {fullyEnabled ? 'Connected — accepting payments' :
                 onboardingIncomplete ? 'Onboarding in progress' :
                 status?.connected ? 'Connected' : 'Not connected'}
              </p>
              {status?.account_id && (
                <p className="text-xs text-gray-400 mt-1 font-mono">{status.account_id}</p>
              )}
              {status?.requirements?.disabled_reason && (
                <p className="text-xs text-red-600 mt-2">
                  Stripe disabled this account: {status.requirements.disabled_reason}
                </p>
              )}
              {status?.requirements && status.requirements.currently_due.length > 0 && (
                <p className="text-xs text-amber-700 mt-2">
                  Stripe needs more info: {status.requirements.currently_due.join(', ')}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {!status?.connected && (
              <button
                onClick={() => startOnboarding('connect')}
                disabled={!status?.configured || busy !== null}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold"
              >
                {busy === 'connect' ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                Connect with Stripe
              </button>
            )}
            {onboardingIncomplete && (
              <button
                onClick={() => startOnboarding('continue')}
                disabled={busy !== null}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold"
              >
                {busy === 'continue' ? <Loader2 size={14} className="animate-spin" /> : <AlertCircle size={14} />}
                Continue onboarding
              </button>
            )}
            {fullyEnabled && (
              <button
                onClick={openDashboard}
                disabled={busy !== null}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold"
              >
                {busy === 'dashboard' ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                Open Stripe Dashboard
              </button>
            )}
            {status?.connected && (
              <button
                onClick={loadStatus}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold"
              >
                Refresh status
              </button>
            )}
          </div>

          {fullyEnabled && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-100">
                <CheckCircle2 size={14} className="text-green-600" />
                <div>
                  <p className="text-xs font-bold text-green-800">Payments enabled</p>
                  <p className="text-[11px] text-green-700">Customers can pay invoices online</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-100">
                <Banknote size={14} className="text-green-600" />
                <div>
                  <p className="text-xs font-bold text-green-800">Payouts enabled</p>
                  <p className="text-[11px] text-green-700">Funds deposit to your bank</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* What you'll see in Stripe Dashboard */}
        {fullyEnabled && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">In Stripe Dashboard</p>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-teal-500 font-bold">✦</span> Available balance &amp; upcoming payouts</li>
              <li className="flex items-start gap-2"><span className="text-teal-500 font-bold">✦</span> Payout schedule (daily by default)</li>
              <li className="flex items-start gap-2"><span className="text-teal-500 font-bold">✦</span> Transaction history with customer details</li>
              <li className="flex items-start gap-2"><span className="text-teal-500 font-bold">✦</span> Update bank account or tax info</li>
              <li className="flex items-start gap-2"><span className="text-teal-500 font-bold">✦</span> Issue refunds</li>
            </ul>
          </div>
        )}

        {/* Fees disclosure */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 text-sm text-gray-600">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="text-gray-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-800 mb-1">Pricing</p>
              <p className="text-xs leading-relaxed">
                Stripe charges <strong>2.9% + 30¢</strong> per successful card transaction (varies by payment method
                — Klarna, Afterpay, and ACH have their own rates). Prolink charges a <strong>2% platform fee</strong>{' '}
                deducted automatically per transaction. Both fees come off the top before funds reach your bank.
                You can see the exact breakdown for any transaction inside the Stripe Dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
