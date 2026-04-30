'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, CheckCircle2 } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import { supabase } from '../../../lib/supabase-client'

export default function NewCustomer() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  })

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim()) return
    setLoading(true)

    const { error } = await supabase.from('pl_customers').insert({
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    })

    setLoading(false)
    if (error) {
      alert('Error creating customer: ' + error.message)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/customers'), 1500)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }, { label: 'New Customer', href: '/customers/new' }]} />
        <div className="max-w-3xl mx-auto p-4 md:p-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-teal-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">Customer Added!</p>
            <p className="text-gray-500 text-sm mt-2">Redirecting to Customer Hub...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }, { label: 'New Customer', href: '/customers/new' }]} />
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Customer Hub</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Add New Customer</h2>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide">Personal Details</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
                <input required value={form.full_name} onChange={handleChange('full_name')}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="John Smith" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
                <input value={form.phone} onChange={handleChange('phone')} type="tel"
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="(801) 555-0100" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                <input value={form.email} onChange={handleChange('email')} type="email"
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="customer@example.com" />
              </div>
            </div>

            <div className="space-y-5">
              <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide">Primary Property</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Street Address</label>
                <input value={form.address} onChange={handleChange('address')}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="123 Main St, SLC, UT" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={handleChange('notes')} rows={4}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition resize-none"
                  placeholder="Gate codes, pet info, special instructions..." />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button type="button" onClick={() => router.back()}
              className="flex-1 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading || !form.full_name.trim()}
              className="flex-1 py-3.5 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">
              <Plus size={15} />
              {loading ? 'Saving...' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
