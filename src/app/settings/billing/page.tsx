'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Zap, AlertCircle, Users, CreditCard } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import { supabase } from '../../../lib/supabase-client'
import { apiFetch } from '../../../lib/api-fetch'

const BASE_PRICE = 49
const SEAT_PRICE = 15
const TRIAL_DAYS = 14

function total(seats: number) {
  const s = Math.max(1, Math.floor(seats || 1))
  return BASE_PRICE + SEAT_PRICE * (s - 1)
}

function BillingInner() {
  const params = useSearchParams()
  const checkout = params.get('checkout')
  const [status, setStatus] = useState('trialing')
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [seats, setSeats] = useState(1)
  const [hasStripe, setHasStripe] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (checkout === 'success') setMsg({ type: 'success', text: 'Subscription started — you’re all set.' })
    if (checkout === 'cancelled') setMsg({ type: 'error', text: 'Checkout cancelled — no changes were made.' })
  }, [checkout])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('customers')
        .select('subscription_status, trial_ends_at, seats, stripe_customer_id')
        .eq('id', session.user.id)
        .single()
      if (data) {
        setStatus(data.subscription_status || 'trialing')
        setTrialEndsAt(data.trial_ends_at)
        setSeats(Math.max(1, data.seats || 1))
        setHasStripe(Boolean(data.stripe_customer_id))
      }
      setLoading(false)
    }
    load()
  }, [])

  const saveSeats = async (next: number) => {
    const s = Math.max(1, Math.floor(next))
    setSeats(s)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('customers').update({ seats: s }).eq('id', session.user.id)
  }

  const subscribe = async () => {
    setBusy(true)
    setMsg(null)
    const r = await apiFetch<{ url: string }>('/api/stripe/subscription', {
      method: 'POST',
      body: JSON.stringify({ seats }),
    })
    if (r.data?.url) window.location.href = r.data.url
    else { setMsg({ type: 'error', text: r.message || r.error || 'Could not start checkout.' }); setBusy(false) }
  }

  const manageBilling = async () => {
    setBusy(true)
    setMsg(null)
    const r = await apiFetch<{ url: string }>('/api/stripe/portal', { method: 'POST' })
    if (r.data?.url) window.location.href = r.data.url
    else { setMsg({ type: 'error', text: r.message || r.error || 'Could not open billing.' }); setBusy(false) }
  }

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : null
  const onTrial = status === 'trialing'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[
        { label: 'Settings', href: '/settings' },
        { label: 'Billing & Subscription', href: '/settings/billing' },
      ]} />
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Account</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing & Subscription</h2>

        {msg && (
          <div className={`mb-5 flex items-center gap-2 p-4 rounded-xl border text-sm font-semibold ${
            msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {msg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {msg.text}
          </div>
        )}

        {/* The plan */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Your Plan</p>
              <p className="text-lg font-bold text-gray-900">Prolink — Standard</p>
              <p className="text-sm text-gray-500 mt-0.5">
                ${BASE_PRICE}/mo base (includes 1 seat) + ${SEAT_PRICE}/mo per additional seat
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">${total(seats)}<span className="text-sm font-normal text-gray-400">/mo</span></p>
              <p className="text-xs text-gray-400">{seats} seat{seats !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              status === 'active' ? 'bg-green-50 text-green-700'
              : onTrial ? 'bg-blue-50 text-blue-700'
              : 'bg-red-50 text-red-600'
            }`}>
              {onTrial ? 'Free Trial' : status.replace('_', ' ')}
            </span>
            {onTrial && trialDaysLeft !== null && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Zap size={12} className="text-blue-500" />
                {trialDaysLeft > 0 ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left` : 'Trial ended'}
              </span>
            )}
          </div>
        </div>

        {/* Seats */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Users size={15} className="text-teal-600" />
            <p className="text-sm font-bold text-gray-900">Team seats</p>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            The owner is included in the ${BASE_PRICE} base. Each additional team member is +${SEAT_PRICE}/mo.
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => saveSeats(seats - 1)} disabled={seats <= 1}
              className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 font-bold disabled:opacity-40">−</button>
            <span className="text-lg font-bold text-gray-900 w-10 text-center">{seats}</span>
            <button onClick={() => saveSeats(seats + 1)}
              className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 font-bold">+</button>
            <span className="text-sm text-gray-500 ml-2">→ ${total(seats)}/mo</span>
          </div>
          {hasStripe && (
            <p className="text-[11px] text-gray-400 mt-3">
              Seat count is saved now; the charged amount updates when you start or manage your subscription.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {hasStripe ? (
            <button onClick={manageBilling} disabled={busy}
              className="flex items-center gap-2 px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm disabled:opacity-50">
              <CreditCard size={15} /> {busy ? 'Opening…' : 'Manage billing'}
            </button>
          ) : (
            <button onClick={subscribe} disabled={busy}
              className="flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm disabled:opacity-50">
              <CreditCard size={15} /> {busy ? 'Starting…' : `Start subscription — $${total(seats)}/mo`}
            </button>
          )}
        </div>

        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 text-sm text-gray-500 mt-6">
          <p className="font-semibold text-gray-700 mb-1">How billing works</p>
          <p>
            Every account gets a {TRIAL_DAYS}-day free trial. After that it&apos;s ${BASE_PRICE}/mo plus
            ${SEAT_PRICE}/mo for each seat beyond the owner. Manage or cancel anytime. Questions?{' '}
            <a href="mailto:hello@useezly.com" className="text-teal-600 font-semibold hover:underline">hello@useezly.com</a>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingInner />
    </Suspense>
  )
}
