'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase-client'

type Step = 1 | 2 | 3

export default function SignupPage() {
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    { num: 3, label: 'Expertise' }
  ]

  const trade = formData.specialties[0] || 'General Contracting'

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError('')

    try {
      // OAuth doesn’t collect the full business profile in this flow.
      // The server callback will ensure profiles/pl_contractors exist with defaults.
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('ezly_oauth_role', 'contractor')
      }

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (authError) setError(authError.message)
    } catch (err: any) {
      setError(err.message || 'Failed to sign up with Google')
    } finally {
      setLoading(false)
    }
  }

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

      // 1) profiles (used by login + role routing)
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: formData.ownerName || data.user.email?.split('@')[0],
        role: 'contractor'
      })

      if (profileError) throw profileError

      // 2) pl_contractors (used by contractor lists)
      const { error: contractorError } = await supabase.from('pl_contractors').upsert({
        id: data.user.id,
        trade,
        phone: formData.phone
      })

      if (contractorError) throw contractorError

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
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[#0f3a7d] font-bold text-xl tracking-tight">Prolink</span>
            <span className="text-gray-300 font-light">by</span>
            <span className="text-[#14b8a6] font-bold text-xl tracking-tight">EZLY</span>
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-[#0f3a7d] transition-colors">
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
                      ? 'bg-[#0f3a7d] border-[#0f3a7d] text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {step > s.num ? <CheckCircle size={18} /> : s.num}
                </div>
                <span
                  className={`text-xs mt-1.5 font-medium ${
                    step >= s.num ? 'text-[#0f3a7d]' : 'text-gray-400'
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
              <h1 className="text-2xl font-bold text-[#0f3a7d]">Create Your Account</h1>
              <p className="text-gray-500 text-sm">Start your account with email/password or Google.</p>

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
                className="w-full py-3 bg-[#0f3a7d] text-white rounded-xl font-semibold hover:bg-[#0c2e5c] disabled:bg-gray-200 disabled:text-gray-400 transition text-sm"
              >
                Continue
              </button>

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-gray-200" />
                <span className="mx-4 text-xs text-gray-400">or</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition text-sm font-semibold text-gray-700 flex items-center justify-center gap-3"
              >
                Continue with Google
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-[#0f3a7d]">Your Business Details</h1>
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
                  disabled={loading}
                  className="flex-1 py-3 bg-[#14b8a6] text-white rounded-xl font-semibold hover:bg-[#0d9e8c] disabled:bg-gray-200 disabled:text-gray-400 transition text-sm"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-[#0f3a7d]">Your Expertise</h1>
              <p className="text-gray-500 text-sm">Select specialties and answers for vetting.</p>

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
                  disabled={loading}
                  className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-gray-300 transition text-sm"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleEmailSignup}
                  disabled={loading || formData.specialties.length === 0 || !formData.phone}
                  className="flex-1 py-3 bg-[#0f3a7d] text-white rounded-xl font-semibold hover:bg-[#082860] disabled:bg-gray-200 disabled:text-gray-400 transition text-sm"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>

              <div className="text-xs text-gray-400 pt-1">
                Note: Only fields that exist in Supabase tables are saved (profiles + pl_contractors).
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
