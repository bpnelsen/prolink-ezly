'use client'
import { useState, useEffect } from 'react'
import { CheckCircle2, Zap, AlertCircle } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import { supabase } from '../../../lib/supabase-client'

type Plan = 'trial' | 'starter' | 'pro' | 'business'

const PLANS = [
  {
    id: 'starter' as Plan,
    name: 'Starter',
    price: 29,
    desc: 'For solo contractors just starting out.',
    features: ['Up to 25 customers', 'Basic invoicing', 'Email support'],
    popular: false,
  },
  {
    id: 'pro' as Plan,
    name: 'Pro',
    price: 49,
    desc: 'For growing contractors who want more.',
    features: ['Unlimited customers', 'Full invoicing + payments', 'Job management + scheduling', 'Business analytics'],
    popular: true,
  },
  {
    id: 'business' as Plan,
    name: 'Business',
    price: 149,
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
  const [currentPlan, setCurrentPlan] = useState<Plan>('trial')
  const [planStatus, setPlanStatus] = useState<string>('active')
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('customers')
        .select('plan, plan_status, trial_ends_at')
        .eq('id', session.user.id)
        .single()
      if (data) {
        setCurrentPlan((data.plan as Plan) || 'trial')
        setPlanStatus(data.plan_status || 'active')
        setTrialEndsAt(data.trial_ends_at)
      }
      setLoading(false)
    }
    load()
  }, [])

  const changePlan = async (plan: Plan) => {
    setSaving(true)
    setMsg(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error } = await supabase
      .from('customers')
      .update({
        plan,
        plan_status: 'active',
        trial_ends_at: plan === 'trial'
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          : null,
        plan_started_at: new Date().toISOString(),
      })
      .eq('id', session.user.id)
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setCurrentPlan(plan)
      setMsg({ type: 'success', text: `Plan updated to ${plan === 'trial' ? 'Free Trial' : PLANS.find(p => p.id === plan)?.name}` })
    }
    setSaving(false)
  }

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  const badge = PLAN_LABELS[currentPlan]

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
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Account</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing & Subscription</h2>

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
            {planStatus !== 'active' && (
              <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-50 text-red-600">
                {planStatus.replace('_', ' ')}
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
                        onClick={() => changePlan(plan.id)}
                        disabled={saving}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 ${
                          plan.popular
                            ? 'bg-teal-600 hover:bg-teal-700 text-white'
                            : 'bg-gray-900 hover:bg-gray-800 text-white'
                        }`}
                      >
                        {saving ? '...' : currentPlan === 'trial' ? 'Choose Plan' : 'Switch'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 text-sm text-gray-500">
          <p className="font-semibold text-gray-700 mb-1">Billing questions?</p>
          <p>All plans include a 14-day free trial. Contact <a href="mailto:hello@useezly.com" className="text-teal-600 font-semibold hover:underline">hello@useezly.com</a> for billing support, invoices, or to cancel your subscription.</p>
        </div>
      </div>
    </div>
  )
}
