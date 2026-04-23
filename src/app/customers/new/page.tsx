'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

export default function NewCustomerPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    street_address: '',
    city: '',
    zip_code: '',
    notes: ''
  })

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        alert('Not logged in')
        return
      }

      const { error } = await supabase.from('pl_customers').insert({
        contractor_id: user.id,
        ...formData
      })

      if (error) {
        alert('Error: ' + error.message)
        return
      }

      router.push('/customers')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="card p-8 bg-white">
          <h2 className="text-2xl font-bold mb-8 text-gray-900">Add New Customer</h2>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="font-bold text-teal-600">Personal Details</h3>
                <input
                  required
                  placeholder="First Name"
                  className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                />
                <input
                  required
                  placeholder="Last Name"
                  className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                />
                <input
                  required
                  placeholder="Phone Number"
                  className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
                <input
                  required
                  placeholder="Email Address"
                  className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Primary Property */}
              <div className="space-y-4">
                <h3 className="font-bold text-teal-600">Primary Property</h3>
                <input
                  required
                  placeholder="Street Address"
                  className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  onChange={e => setFormData({ ...formData, street_address: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-4">
                  <input
                    required
                    placeholder="City"
                    className="bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                  />
                  <input
                    required
                    placeholder="Zip Code"
                    className="bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    onChange={e => setFormData({ ...formData, zip_code: e.target.value })}
                  />
                </div>

                <textarea
                  required
                  placeholder="Notes (Gate codes, pet info, etc.)"
                  className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 h-28 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-700 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? 'Creating...' : 'Create Customer Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
