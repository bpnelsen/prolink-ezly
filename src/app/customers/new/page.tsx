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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Not logged in')

    const { error } = await supabase.from('pl_customers').insert({
      contractor_id: user.id,
      ...formData
    })

    if (error) {
      alert('Error: ' + error.message)
    } else {
      router.push('/customers')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-[#0f3a7d] mb-6">Add New Customer</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="First Name" className="p-3 border rounded-lg" onChange={e => setFormData({...formData, first_name: e.target.value})} />
            <input required placeholder="Last Name" className="p-3 border rounded-lg" onChange={e => setFormData({...formData, last_name: e.target.value})} />
          </div>
          <input type="tel" placeholder="Phone" className="w-full p-3 border rounded-lg" onChange={e => setFormData({...formData, phone: e.target.value})} />
          <input type="email" placeholder="Email" className="w-full p-3 border rounded-lg" onChange={e => setFormData({...formData, email: e.target.value})} />
          <input placeholder="Address" className="w-full p-3 border rounded-lg" onChange={e => setFormData({...formData, street_address: e.target.value})} />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-[#14b8a6] text-white font-bold rounded-xl"
          >
            {loading ? 'Creating...' : 'Create Customer'}
          </button>
        </form>
      </div>
    </div>
  )
}
