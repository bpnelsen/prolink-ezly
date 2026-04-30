'use client'
import { useState, useEffect } from 'react'
import { CheckCircle2, Save } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import { supabase } from '../../../lib/supabase-client'

export default function ProfilePage() {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    business_name: '',
    trade: '',
    phone: '',
    status: 'available',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    website: '',
    description: '',
    years_in_business: '',
  })

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setSaved(false)
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('pl_contractors').select('*').eq('id', user.id).single()
      if (data) setForm({
        business_name: data.business_name || '',
        trade: data.trade || '',
        phone: data.phone || '',
        status: data.status || 'available',
        street_address: data.street_address || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || '',
        website: data.website || '',
        description: data.description || '',
        years_in_business: data.years_in_business ? String(data.years_in_business) : '',
      })
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { error } = await supabase.from('pl_contractors').upsert({
      id: user.id,
      business_name: form.business_name.trim() || null,
      trade: form.trade.trim() || null,
      phone: form.phone.trim() || null,
      status: form.status || 'available',
      street_address: form.street_address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      zip_code: form.zip_code.trim() || null,
      website: form.website.trim() || null,
      description: form.description.trim() || null,
      years_in_business: form.years_in_business ? parseInt(form.years_in_business) : null,
    })

    setLoading(false)
    if (!error) setSaved(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'My Profile', href: '/settings/profile' }]} />
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Settings</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">My Profile</h2>

        {saved && (
          <div className="flex items-center gap-3 mb-6 p-4 bg-teal-50 text-teal-700 rounded-xl text-sm font-semibold">
            <CheckCircle2 size={16} /> Profile saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-8">
          {/* Business Info */}
          <div className="space-y-5">
            <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide">Business Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Business Name</label>
                <input value={form.business_name} onChange={handleChange('business_name')}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="ABC Plumbing & Heating" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Trade / Specialty</label>
                <input value={form.trade} onChange={handleChange('trade')}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="Plumber, Electrician, HVAC..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
                <input value={form.phone} onChange={handleChange('phone')} type="tel"
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="(801) 555-0100" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                <select value={form.status} onChange={handleChange('status')}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition">
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="on_break">On Break</option>
                  <option value="new">New</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Years in Business</label>
                <input value={form.years_in_business} onChange={handleChange('years_in_business')} type="number" min="0"
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="5" />
              </div>
            </div>
          </div>

          {/* Business Address */}
          <div className="space-y-5">
            <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide">Business Address</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Street Address</label>
              <input value={form.street_address} onChange={handleChange('street_address')}
                className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                placeholder="456 Commerce Ave, Suite 100" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">City</label>
                <input value={form.city} onChange={handleChange('city')}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="Salt Lake City" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">State</label>
                <input value={form.state} onChange={handleChange('state')}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="UT" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Zip Code</label>
                <input value={form.zip_code} onChange={handleChange('zip_code')}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="84101" />
              </div>
            </div>
          </div>

          {/* Web & Description */}
          <div className="space-y-5">
            <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide">Web & Description</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Website</label>
              <input value={form.website} onChange={handleChange('website')} type="url"
                className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                placeholder="https://yourbusiness.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
              <textarea value={form.description} onChange={handleChange('description')} rows={4}
                className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition resize-none"
                placeholder="Brief description of your services and areas you serve..." />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">
            <Save size={15} />
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
