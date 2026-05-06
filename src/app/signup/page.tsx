'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase-client'
import ProlinkLogoDark from '../../components/ProlinkLogoDark'

type Step = 1 | 2 | 3 | 4
type Plan = 'trial' | 'starter' | 'pro' | 'business'

const PLANS = [
  {
    id: 'starter' as Plan,
    name: 'Starter',
    price: 29,
    desc: 'For solo contractors just starting out.',
    features: ['Up to 25 customers', 'Basic invoicing', 'Email support'],
    color: 'border-gray-200',
    badge: '',
  },
  {
    id: 'pro' as Plan,
    name: 'Pro',
    price: 49,
    desc: 'For growing contractors who want more.',
    features: ['Unlimited customers', 'Full invoicing + payments', 'Job management + scheduling', 'Business analytics'],
    color: 'border-teal-500',
    badge: 'Most Popular',
  },
  {
    id: 'business' as Plan,
    name: 'Business',
    price: 149,
    desc: 'For teams with multiple crews.',
    features: ['Everything in Pro', 'Multi-user access', 'API access', 'Dedicated support'],
    color: 'border-gray-200',
    badge: '',
  },
]

export default function SignupPage() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<Plan>('trial')

  useEffect(() => {
    const p = searchParams.get('plan') as Plan | null
    if (p && ['starter', 'pro', 'business'].includes(p)) setSelectedPlan(p)
  }, [searchParams])

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    businessName: '',
    ownerName: '',
    phone: '',
    serviceAreas: '',
    specialties: [] as string[],
    yearsExperience: '',
    licensed: '',
    insured: '',
    howDidYouHear: ''
  })

  const specialtiesOptions = [
    'Kitchen Remodeling',
    'Bathroom Renovation',
    'Roofing',
    'Electrical',
    'HVAC',
    'Plumbing',
    'Flooring',
    'Painting',
    'Carpentry',
    'Landscaping',
    'Masonry',
    'General Contracting'
  ]

  const steps: { num: Step; label: string }[] = [
    { num: 1, label: 'Account' },
    { num: 2, label: 'Business' },
    { num: 3, label: 'Expertise' },
    { num: 4, label: 'Plan' },
  ]

const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target

    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        specialties: checked
          ? [...prev.specialties, value]
          : prev.specialties.filter((t) => t !== value)
      }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleEmailSignup = async () => {
    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.ownerName,
            phone: formData.phone,
            role: 'contractor',
            business_name: formData.businessName
          }
        }
      })

      if (authError) throw authError
      if (!data.user) throw new Error('No user returned from sign up')

      const userId = data.user.id

      // Create profiles row
      await supabase.from('profiles').upsert({
        id: userId,
        email: formData.email,
        full_name: formData.ownerName || formData.email.split('@')[0],
        role: 'contractor',
      })

      // Create customers row with all signup data
      await supabase.from('customers').upsert({
        id: userId,
        business_name: formData.businessName || null,
        owner_name: formData.ownerName || null,
        phone: formData.phone || null,
        service_areas: formData.serviceAreas || null,
        trade: formData.specialties.length > 0 ? formData.specialties[0] : null,
        plan: selectedPlan,
        plan_status: 'active',
        trial_ends_at: selectedPlan === 'trial'
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          : null,
        plan_started_at: new Date().toISOString(),
      })

      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/"><ProlinkLogoDark className="w-36 h-auto" /></Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-[#0f1d35] transition-colors">
            ← Back to Home
          </Link>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-6 py-12">
        {/* Step indicator */}
        <div className="flex items-center justify-center mb-10">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    step > s.num
                      ? 'bg-[#14b8a6] border-[#14b8a6] text-white'
                      : step === s.num
                      ? 'bg-[#0f1d35] border-[#0f1d35] text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {step > s.num ? <CheckCircle size={18} /> : s.num}
                </div>
                <span
                  className={`text-xs mt-1.5 font-medium ${
                    step >= s.num ? 'text-[#0f1d35]' : 'text-gray-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-20 h-0.5 mx-2 mb-5 rounded transition-colors ${
                    step > s.num ? 'bg-[#14b8a6]' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h1 className="text-2xl font-bold text-[#0f1d35]">Create Your Account</h1>
              <p className="text-gray-500 text-sm">Start your account with email and a secure password.</p>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@yourcompany.com"
                  className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition text-gray-900 text-sm"
                />
              </div>


              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition text-gray-900 text-sm"
                />
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!formData.email || formData.password.length < 8 || loading}
                className="w-full py-3 bg-[#0f1d35] text-white rounded-xl font-semibold hover:bg-[#0a1628] disabled:bg-gray-200 disabled:text-gray-400 transition text-sm"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-[#0f1d35]">Your Business Details</h1>
              <p className="text-gray-500 text-sm">Tell us about your contracting business.</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Name</label>
                  <input
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="ABC Remodeling"
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition text-gray-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Owner Name</label>
                  <input
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleChange}
                    placeholder="First Last"
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition text-gray-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone</label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(801) 555-0101"
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition text-gray-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Service Areas</label>
                  <input
                    name="serviceAreas"
                    value={formData.serviceAreas}
                    onChange={handleChange}
                    placeholder="Salt Lake City, West Valley, ..."
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition text-gray-900 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-gray-300 transition text-sm"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-[#14b8a6] text-white rounded-xl font-semibold hover:bg-[#0d9e8c] disabled:bg-gray-200 disabled:text-gray-400 transition text-sm"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-[#0f1d35]">Your Expertise</h1>
              <p className="text-gray-500 text-sm">Select specialties and answer a few questions.</p>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Specialties</label>
                <div className="grid grid-cols-2 gap-2">
                  {specialtiesOptions.map((sp) => (
                    <label
                      key={sp}
                      className="flex items-center gap-2 p-3 bg-[#f8fafc] border border-gray-200 rounded-xl cursor-pointer hover:border-[#14b8a6] transition text-sm"
                    >
                      <input
                        type="checkbox"
                        name="specialties"
                        value={sp}
                        checked={formData.specialties.includes(sp)}
                        onChange={handleChange}
                        className="w-4 h-4 text-[#14b8a6] rounded"
                      />
                      <span className="text-gray-700 text-xs">{sp}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Years of Experience</label>
                  <select
                    name="yearsExperience"
                    value={formData.yearsExperience}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition text-sm text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="0-2">0–2 years</option>
                    <option value="3-5">3–5 years</option>
                    <option value="6-10">6–10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Licensed?</label>
                  <select
                    name="licensed"
                    value={formData.licensed}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition text-sm text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Insured?</label>
                <select
                  name="insured"
                  value={formData.insured}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition text-sm text-gray-900"
                >
                  <option value="">Select...</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">How did you hear about us?</label>
                <input
                  name="howDidYouHear"
                  value={formData.howDidYouHear}
                  onChange={handleChange}
                  placeholder="Google, referral, social..."
                  className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition text-sm text-gray-900"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-gray-300 transition text-sm"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  disabled={formData.specialties.length === 0 || !formData.phone}
                  className="flex-1 py-3 bg-[#14b8a6] text-white rounded-xl font-semibold hover:bg-[#0d9e8c] disabled:bg-gray-200 disabled:text-gray-400 transition text-sm"
                >
                  Choose Plan →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-[#0f1d35]">Choose Your Plan</h1>
                <p className="text-gray-500 text-sm mt-1">Start free for 14 days. No credit card required.</p>
              </div>

              <div className="space-y-3">
                {/* Trial option */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('trial')}
                  className={`w-full text-left p-4 rounded-xl border-2 transition ${
                    selectedPlan === 'trial' ? 'border-[#0f1d35] bg-[#0f1d35]/5' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-teal-500" />
                        <span className="font-bold text-sm text-gray-900">14-Day Free Trial</span>
                        <span className="text-[10px] font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">Recommended</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 ml-5">Try everything free, pick a plan later</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'trial' ? 'border-[#0f1d35]' : 'border-gray-300'}`}>
                      {selectedPlan === 'trial' && <div className="w-2 h-2 rounded-full bg-[#0f1d35]" />}
                    </div>
                  </div>
                </button>

                {/* Paid plans */}
                {PLANS.map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition ${
                      selectedPlan === plan.id
                        ? 'border-[#14b8a6] bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-gray-900">{plan.name}</span>
                          {plan.badge && (
                            <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{plan.badge}</span>
                          )}
                          <span className="text-sm font-bold text-gray-700 ml-auto mr-4">${plan.price}<span className="text-xs font-normal text-gray-400">/mo</span></span>
                        </div>
                        <ul className="mt-1.5 space-y-0.5">
                          {plan.features.slice(0, 2).map(f => (
                            <li key={f} className="text-xs text-gray-500 flex items-center gap-1">
                              <span className="text-teal-500">✦</span> {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${selectedPlan === plan.id ? 'border-teal-500' : 'border-gray-300'}`}>
                        {selectedPlan === plan.id && <div className="w-2 h-2 rounded-full bg-teal-500" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {selectedPlan !== 'trial' && (
                <p className="text-xs text-gray-400 text-center">Billing starts after your 14-day trial. Cancel anytime.</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-gray-300 transition text-sm"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleEmailSignup}
                  disabled={loading}
                  className="flex-1 py-3 bg-[#0f1d35] text-white rounded-xl font-semibold hover:bg-[#0a1628] disabled:bg-gray-200 disabled:text-gray-400 transition text-sm"
                >
                  {loading ? 'Creating Account...' : 'Create Account →'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-[#14b8a6] hover:text-[#0d9e8c] font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
