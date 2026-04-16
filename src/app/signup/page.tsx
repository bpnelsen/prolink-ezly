'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

export default function SignupPage() {
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
    howDidYouHear: ''
  })

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError('')

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=contractor`,
        },
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
      setFormData(prev => ({
        ...prev,
        specialties: checked 
          ? [...prev.specialties, value]
          : prev.specialties.filter(t => t !== value)
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSignup = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.ownerName, phone: formData.phone, role: 'contractor', business_name: formData.businessName } }
      })
      if (authError) throw authError
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
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
        if (profileError) throw profileError
      }
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const specialties = ['Kitchen Remodeling', 'Bathroom Renovation', 'Roofing', 'Electrical', 'HVAC', 'Plumbing', 'Flooring', 'Painting', 'Carpentry', 'Landscaping', 'Masonry', 'General Contracting']

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-[#0f3a7d] font-bold text-2xl tracking-tight">Prolink</Link>
          <Link href="https://useezly.com" className="text-gray-500 hover:text-[#0f3a7d] text-sm flex items-center gap-2">
            <ArrowLeft size={16} /> Back to EZLY
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#0f3a7d]">Create Your Prolink Account</h2>
            <p className="text-gray-500 text-sm mt-1">Step {step} of 3</p>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#14b8a6]" placeholder="you@work.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#14b8a6]" />
              </div>
              <button onClick={() => setStep(2)} className="w-full py-2.5 bg-[#0f3a7d] text-white rounded-lg font-semibold hover:bg-[#0c2e5c]">Continue</button>
              <div className="text-center text-sm text-gray-400">or</div>
              <button onClick={handleGoogleSignup} className="w-full py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-gray-700 text-sm">Continue with Google</button>
            </div>
          )}
          
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Business Name</label>
                <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#14b8a6]" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-2.5 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200">Back</button>
                <button onClick={() => setStep(3)} className="flex-1 py-2.5 bg-[#0f3a7d] text-white rounded-lg font-semibold hover:bg-[#0c2e5c]">Continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Specialties</label>
                <div className="grid grid-cols-2 gap-2">
                  {specialties.map(t => (
                    <label key={t} className="flex items-center gap-2 text-sm text-gray-600">
                      <input type="checkbox" name="specialties" value={t} checked={formData.specialties.includes(t)} onChange={handleChange} /> {t}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-2.5 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200">Back</button>
                <button onClick={handleSignup} className="flex-1 py-2.5 bg-[#14b8a6] text-white rounded-lg font-semibold hover:bg-[#0d9e8c]">Create Account</button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account? <Link href="/login" className="text-[#14b8a6] font-semibold">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
