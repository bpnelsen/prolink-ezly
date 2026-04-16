'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import EzlyLogo from '@/components/EzlyLogo'

export default function ContractorSignup() {
  const [step, setStep] = useState(1)
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
    licenses: '',
    howDidYouHear: ''
  })

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=contractor`,
        },
      })

      if (authError) {
        setError(authError.message)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up with Google')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        specialties: checked 
          ? [...prev.specialties, value]
          : prev.specialties.filter(t => t !== value)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSignup = async () => {
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

      if (authError) {
        setError(authError.message)
        return
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: formData.email,
            full_name: formData.ownerName,
            business_name: formData.businessName,
            role: 'contractor',
            metadata: {
              serviceAreas: formData.serviceAreas,
              specialties: formData.specialties,
              yearsExperience: formData.yearsExperience,
              licensed: formData.licensed,
              insured: formData.insured,
              howDidYouHear: formData.howDidYouHear
            }
          })
          
        if (profileError) console.error('Error creating profile:', profileError)
      }

      window.location.href = '/dashboard/contractor'
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const specialties = [
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

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <EzlyLogo className="w-28 h-auto" />
            <span className="text-[#0f3a7d] font-bold text-lg tracking-tight">Prolink</span>
          </Link>
          <Link href="/" className="text-gray-500 hover:text-[#0f3a7d] text-sm font-medium transition-colors flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-lg mx-auto px-6 py-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#0f3a7d] mb-2">
            {step === 1 && 'Create Your Account'}
            {step === 2 && 'Your Business Details'}
            {step === 3 && 'Your Expertise'}
          </h2>
          <p className="text-gray-600">
            {step === 1 && 'Start your 14-day free trial. No credit card required.'}
            {step === 2 && 'Tell us about your contracting business'}
            {step === 3 && 'Help homeowners find you for the right projects'}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex gap-2">
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-[#14b8a6]' : 'bg-gray-200'}`}></div>
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-[#14b8a6]' : 'bg-gray-200'}`}></div>
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 3 ? 'bg-[#14b8a6]' : 'bg-gray-200'}`}></div>
          </div>
          <p className="text-sm text-gray-500 mt-3">Step {step} of 3</p>
        </div>

        {/* Step 1: Email & Password */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@yourcompany.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition"
              />
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!formData.email || formData.password.length < 8}
              className="w-full py-3 bg-[#14b8a6] text-white rounded-lg font-semibold hover:bg-[#0d9e8c] disabled:bg-gray-300 transition"
            >
              Continue
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">or</span></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className="w-full py-3 border border-gray-300 rounded-lg text-gray-900 hover:bg-gray-50 transition font-medium disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        )}

        {/* Step 2: Business Info */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Business Name</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Your Company Name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Owner / Contact Name</label>
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                placeholder="John Smith"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Service Areas</label>
              <input
                type="text"
                name="serviceAreas"
                value={formData.serviceAreas}
                onChange={handleChange}
                placeholder="Salt Lake City, Provo, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-900 rounded-lg font-semibold hover:border-gray-400 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!formData.businessName || !formData.ownerName || !formData.phone}
                className="flex-1 py-3 bg-[#14b8a6] text-white rounded-lg font-semibold hover:bg-[#0d9e8c] disabled:bg-gray-300 transition"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Credentials */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">Specialties (Select all that apply)</label>
              <div className="grid grid-cols-2 gap-3">
                {specialties.map(specialty => (
                  <label key={specialty} className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition text-sm">
                    <input
                      type="checkbox"
                      name="specialties"
                      value={specialty}
                      checked={formData.specialties.includes(specialty)}
                      onChange={handleChange}
                      className="w-4 h-4 text-[#14b8a6] rounded"
                    />
                    <span className="text-gray-700">{specialty}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Years of Experience</label>
              <select
                name="yearsExperience"
                value={formData.yearsExperience}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition"
              >
                <option value="">Select...</option>
                <option value="0-2">0-2 years</option>
                <option value="3-5">3-5 years</option>
                <option value="6-10">6-10 years</option>
                <option value="10+">10+ years</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Licensed?</label>
              <select
                name="licensed"
                value={formData.licensed}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition"
              >
                <option value="">Select...</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Insured?</label>
              <select
                name="insured"
                value={formData.insured}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition"
              >
                <option value="">Select...</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">How did you hear about us?</label>
              <select
                name="howDidYouHear"
                value={formData.howDidYouHear}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent outline-none transition"
              >
                <option value="">Select...</option>
                <option value="google">Google</option>
                <option value="social">Social Media</option>
                <option value="referral">Referral</option>
                <option value="other">Other</option>
              </select>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-900 rounded-lg font-semibold hover:border-gray-400 transition"
              >
                Back
              </button>
              <button
                onClick={handleSignup}
                disabled={loading || formData.specialties.length === 0}
                className="flex-1 py-3 bg-[#14b8a6] text-white rounded-lg font-semibold hover:bg-[#0d9e8c] disabled:bg-gray-300 transition"
              >
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Already have an account? <Link href="/login" className="text-[#14b8a6] hover:text-[#0d9e8c] font-semibold">Sign In</Link></p>
        </div>
      </div>
    </div>
  )
}
