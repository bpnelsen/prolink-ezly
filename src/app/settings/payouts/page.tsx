'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Banknote, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import { apiFetch } from '../../../lib/api-fetch'

type ConnectStatus = 'pending' | 'onboarded' | 'restricted' | 'disabled'

type StatusPayload = {
  hasAccount: boolean
  status: ConnectStatus
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
}

function PayoutsInner() {
  const params = useSearchParams()
  const onboardingFlag = params.get('onboarding')
  const [state, setState] = useState<StatusPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  useEffect(() => {
    if (onboardingFlag === 'return') {
      setMsg({ type: 'info', text: 'Back from Stripe — refreshing your account status.' })
    } else if (onboardingFlag === 'refresh') {
      setMsg({ type: 'info', text: 'Your onboarding link expired. Click "Continue onboarding" to try again.' })
    }
  }, [onboardingFlag])

  const load = async () => {
    const r = await apiFetch<StatusPayload>('/api/stripe/connect/status')
    if (r.data) setState(r.data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const startOnboarding = async () => {
    setBusy(true)
    setMsg(null)
    const r = await apiFetch<{ url: string }>('/api/stripe/connect/onboard', { method: 'POST' })
    if (r.data?.url) {
      window.location.href = r.data.url
    } else {
      setMsg({ type: 'error', text: r.message || r.error || 'Could not start onboarding.' })
      setBusy(false)
    }
  }

  const openDashboard = async () => {
    setBusy(true)
    setMsg(null)
    const r = await apiFetch<{ url: string }>('/api/stripe/connect/dashboard', { method: 'POST' })
    if (r.data?.url) {
      window.location.href = r.data.url
    } else {
      setMsg({ type: 'error', text: r.message || r.error || 'Could not open Stripe dashboard.' })
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  const status: ConnectStatus = state?.status || 'pending'
  const hasAccount = state?.hasAccount ?? false
  const onboarded = status === 'onboarded'
  const inProgress = hasAccount && !onboarded

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[
        { label: 'Settings', href: '/settings' },
        { label: 'Payouts', href: '/settings/payouts' },
      ]} />
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Account</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Payouts</h2>

        {msg && (
          <div className={`mb-5 flex items-center gap-2 p-4 rounded-xl border text-sm font-semibold ${
            msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700'
            : msg.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {msg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {msg.text}
          </div>
        )}

        {/* Status card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Stripe Connect</p>
              <p className="text-lg font-bold text-gray-900">
                {!hasAccount ? 'Not connected' : onboarded ? 'Connected' : 'Onboarding in progress'}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {onboarded
                  ? 'Customer payments deposit directly into your Stripe balance and pay out to your bank on Stripe’s schedule. Prolink never touches the money.'
                  : 'Connect a Stripe account to receive customer payments. Stripe handles bank verification and KYC; Prolink never sees your card or bank details.'}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              onboarded ? 'bg-green-50 text-green-700'
              : inProgress ? 'bg-blue-50 text-blue-700'
              : status === 'disabled' ? 'bg-red-50 text-red-600'
              : 'bg-gray-100 text-gray-600'
            }`}>
              {onboarded ? 'Active'
                : status === 'restricted' ? 'Restricted'
                : status === 'disabled' ? 'Disabled'
                : hasAccount ? 'Pending' : 'Not started'}
            </span>
          </div>

          {hasAccount && (
            <div className="grid grid-cols-2 gap-3 mt-5 text-xs">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className={state?.chargesEnabled ? 'text-green-600' : 'text-gray-400'}>
                  {state?.chargesEnabled ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                </span>
                <span className="font-semibold text-gray-700">Charges {state?.chargesEnabled ? 'enabled' : 'pending'}</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className={state?.payoutsEnabled ? 'text-green-600' : 'text-gray-400'}>
                  {state?.payoutsEnabled ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                </span>
                <span className="font-semibold text-gray-700">Payouts {state?.payoutsEnabled ? 'enabled' : 'pending'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {!hasAccount && (
            <button onClick={startOnboarding} disabled={busy}
              className="flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm disabled:opacity-50">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Banknote size={15} />}
              {busy ? 'Starting…' : 'Connect with Stripe'}
            </button>
          )}
          {inProgress && (
            <button onClick={startOnboarding} disabled={busy}
              className="flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm disabled:opacity-50">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Banknote size={15} />}
              {busy ? 'Opening…' : 'Continue onboarding'}
            </button>
          )}
          {onboarded && (
            <button onClick={openDashboard} disabled={busy}
              className="flex items-center gap-2 px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm disabled:opacity-50">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
              {busy ? 'Opening…' : 'Open Stripe dashboard'}
            </button>
          )}
        </div>

        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 text-sm text-gray-500 mt-6 space-y-3">
          <div>
            <p className="font-semibold text-gray-700 mb-1">How payouts work</p>
            <p>
              When a customer pays an invoice online, the charge goes straight to your Stripe account — Prolink doesn&apos;t hold or route the funds. Stripe pays out to your bank on the schedule you set in your Stripe dashboard. Prolink doesn&apos;t take a cut; only Stripe&apos;s processing fees apply.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Refunds and disputes</p>
            <p>
              Because charges land in your account, you&apos;re the merchant of record. Refunds and chargeback responses are handled from your Stripe dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PayoutsPage() {
  return (
    <Suspense>
      <PayoutsInner />
    </Suspense>
  )
}
