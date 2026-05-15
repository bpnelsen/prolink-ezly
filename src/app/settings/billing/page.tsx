'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Zap, AlertCircle, ExternalLink, Loader2 } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import { supabase } from '../../../lib/supabase-client'
import { apiFetch } from '../../../lib/api-fetch'

type Plan = 'trial' | 'starter' | 'pro' | 'business'

const PLANS = [
  {
    id: 'starter' as Plan,
    name: 'Starter',
    price: 29,
    lookupKey: 'starter_monthly',
    desc: 'For solo contractors just starting out.',
    features: ['Up to 25 customers', 'Basic invoicing', 'Email support'],
    popular: false,
  },
  {
    id: 'pro' as Plan,
    name: 'Pro',
    price: 49,
    lookupKey: 'pro_monthly',
    desc: 'For growing contractors who want more.',
    features: ['Unlimited customers', 'Full invoicing + payments', 'Job management + scheduling', 'Business analytics'],
    popular: true,
  },
  {
    id: 'business' as Plan,
    name: 'Business',
    price: 149,
    lookupKey: 'business_monthly',
    desc: 'For teams with multiple crews.',
    features: ['Everything in Pro', 'Multi-user access', 'API access', 'Dedicated support'],
    popular: false,
  },
]

const PLAN_LABELS: Record<Plan, { label: string; bg: string; text: string }> = {
  trial:    { label: 'Free Trial',  bg: 'bg-blue-50',   text: 'text-blue-700' },
  starter:  { label: 'Starter',    bg: 'bg-gray-100',  text: 'text-gray-700' },
  pro:      { label: 'Pro',        bg: 'bg-teal-50',   text: 'text-teal-700' },
  business: { label: 'Business',   bg: 'bg-purple-50', text: 'text-purple-700' },
}

export default function BillingPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <BillingInner />
    </Suspense>
  )
}

function BillingInner() {
  const params = useSearchParams()
  const success = params.get('success') === '1'
  const canceled = params.get('canceled') === '1'

  const [currentPlan, setCurrentPlan] = useState<Plan>('trial')
  const [planStatus, setPlanStatus] = useState<string>('active')
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false)
  const [periodEnd, setPeriodEnd] = useState<string | null>(null)
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('customers')
        .select('plan, plan_status, trial_ends_at, stripe_customer_id, stripe_subscription_status, subscription_current_period_end, subscription_cancel_at_period_end')
        .eq('id', session.user.id)
        .single()
      if (data) {
        setCurrentPlan((data.plan as Plan) || 'trial')
        setPlanStatus(data.stripe_subscription_status || data.plan_status || 'active')
        setTrialEndsAt(data.trial_ends_at)
        setHasStripeCustomer(!!data.stripe_customer_id)
        setPeriodEnd(data.subscription_current_period_end)
        setCancelAtPeriodEnd(!!data.subscription_cancel_at_period_end)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (success) setMsg({ type: 'success', text: 'Subscription started! Welcome to Prolink.' })
    if (canceled) setMsg({ type: 'error', text: 'Checkout canceled — no changes were made.' })
  }, [success, canceled])

  async function startCheckout(lookupKey: string, plan: Plan) {
    setBusy(plan)
    setMsg(null)
    const res = await apiFetch<{ url: string }>('/api/stripe/subscription/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ lookup_key: lookupKey }),
    })
    if (res.data?.url) {
      window.location.href = res.data.url
      return
    }
    setMsg({ type: 'error', text: res.message || 'Could not start checkout. Make sure Stripe is configured.' })
    setBusy(null)
  }

  async function openPortal() {
    setBusy('portal')
    setMsg(null)
    const res = await apiFetch<{ url: string }>('/api/stripe/subscription/create-portal-session', { method: 'POST' })
    if (res.data?.url) {
      window.location.href = res.data.url
      return
    }
    setMsg({ type: 'error', text: res.message || 'Could not open billing portal.' })
    setBusy(null)
  }

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  const badge = PLAN_LABELS[currentPlan]
  const periodEndDisplay = periodEnd
    ? new Date(periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  if (loading) return <LoadingShell />

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[
        { label: 'Settings', href: '/settings' },
        { label: 'Billing & Subscription', href: '/settings/billing' },
      ]} />
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {/* Branded header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
            <Zap size={14} className="text-teal-400" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Prolink by EZLY · Account</p>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing &amp; Subscription</h2>

        {msg && (
          <div className={`mb-5 flex items-center gap-2 p-4 rounded-xl border text-sm font-semibold ${
            msg.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {msg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {msg.text}
          </div>
        )}

        {/* Current plan card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Current Plan</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
            {planStatus !== 'active' && planStatus !== 'trialing' && (
              <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-50 text-red-600">
                {planStatus.replace(/_/g, ' ')}
              </span>
            )}
            {planStatus === 'trialing' && (
              <span className="px-3 py-1 rounded-full text-sm font-bold bg-blue-50 text-blue-700">
                Trialing
              </span>
            )}
            {currentPlan !== 'trial' && (
              <span className="text-sm text-gray-500">
                ${PLANS.find(p => p.id === currentPlan)?.price}/month
              </span>
            )}
          </div>

          {currentPlan === 'trial' && trialDaysLeft !== null && (
            <div className={`mt-4 flex items-start gap-3 p-4 rounded-xl ${trialDaysLeft <= 3 ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-100'}`}>
              <Zap size={16} className={trialDaysLeft <= 3 ? 'text-red-500 shrink-0 mt-0.5' : 'text-blue-500 shrink-0 mt-0.5'} />
              <div>
                <p className={`text-sm font-bold ${trialDaysLeft <= 3 ? 'text-red-700' : 'text-blue-700'}`}>
                  {trialDaysLeft > 0 ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left in your trial` : 'Trial expired'}
                </p>
                <p className={`text-xs mt-0.5 ${trialDaysLeft <= 3 ? 'text-red-600' : 'text-blue-600'}`}>
                  Choose a plan below to keep full access after your trial ends.
                </p>
              </div>
            </div>
          )}

          {hasStripeCustomer && currentPlan !== 'trial' && (
            <div className="mt-4 flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                {cancelAtPeriodEnd && periodEndDisplay && (
                  <p className="text-amber-700 font-semibold">
                    Cancels on {periodEndDisplay} (you keep full access until then)
                  </p>
                )}
                {!cancelAtPeriodEnd && periodEndDisplay && (
                  <p>Renews {periodEndDisplay}</p>
                )}
              </div>
              <button
                onClick={openPortal}
                disabled={busy !== null}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition"
              >
                {busy === 'portal' ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                Manage your billing
              </button>
            </div>
          )}
        </div>

        {/* Plan cards */}
        <div className="space-y-3 mb-6">
          <p className="text-sm font-bold text-gray-700">Available Plans</p>
          {PLANS.map(plan => {
            const isCurrent = currentPlan === plan.id
            return (
              <div key={plan.id}
                className={`bg-white rounded-2xl border-2 shadow-sm p-5 transition ${
                  isCurrent
                    ? plan.popular ? 'border-teal-500' : 'border-gray-900'
                    : 'border-gray-100 hover:border-gray-200'
                }`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-bold text-gray-900">{plan.name}</p>
                      {plan.popular && (
                        <span className="text-[10px] font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">Most Popular</span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 size={10} /> Current Plan
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{plan.desc}</p>
                    <ul className="space-y-1">
                      {plan.features.map(f => (
                        <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5">
                          <span className="text-teal-500 font-bold">✦</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <p className="text-2xl font-bold text-gray-900">
                      ${plan.price}<span className="text-sm font-normal text-gray-400">/mo</span>
                    </p>
                    {isCurrent ? (
                      <span className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-500 cursor-default">
                        Active
                      </span>
                    ) : (
                      <button
                        onClick={() => startCheckout(plan.lookupKey, plan.id)}
                        disabled={busy !== null}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 ${
                          plan.popular
                            ? 'bg-teal-600 hover:bg-teal-700 text-white'
                            : 'bg-gray-900 hover:bg-gray-800 text-white'
                        }`}
                      >
                        {busy === plan.id && <Loader2 size={12} className="animate-spin" />}
                        {currentPlan === 'trial' ? 'Start 14-day trial' : 'Switch to ' + plan.name}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <p className="text-[11px] text-gray-400 px-1">
            All paid plans start with a 14-day free trial — your card isn&apos;t charged until day 15.
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 text-sm text-gray-500">
          <p className="font-semibold text-gray-700 mb-1">Billing questions?</p>
          <p>
            Manage your card, see invoices, or cancel anytime from the Stripe billing portal (button above).
            For anything else, email <a href="mailto:hello@useezly.com" className="text-teal-600 font-semibold hover:underline">hello@useezly.com</a>.
          </p>
        </div>
      </div>
    </div>
  )
}

function LoadingShell() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
    </div>
  )
}
