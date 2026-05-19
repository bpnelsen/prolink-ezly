'use client'
import { useState } from 'react'
import { Plus, Building2, User, ShieldCheck, ShieldAlert, X } from 'lucide-react'
import AddressAutocomplete, { ParsedAddress } from './AddressAutocomplete'
import AddressMapPreview from './AddressMapPreview'
import { supabase } from '../lib/supabase-client'
import { apiFetch } from '../lib/api-fetch'
import { LIFECYCLE_STATUSES, LEAD_SOURCES, LIFECYCLE_META, titleCase } from '../lib/crm'

export interface CustomerFormValues {
  client_type: 'individual' | 'company'
  company_name: string
  first_name: string
  last_name: string
  phone: string
  email: string
  website: string
  lifecycle_status: string
  lead_source: string
  tags: string[]
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip_code: string
  county: string
  country: string
  latitude: number | null
  longitude: number | null
  google_place_id: string
  formatted_address: string
  address_verified: boolean
  notes: string
}

export const EMPTY_CUSTOMER: CustomerFormValues = {
  client_type: 'individual',
  company_name: '',
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  website: '',
  lifecycle_status: 'lead',
  lead_source: '',
  tags: [],
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip_code: '',
  county: '',
  country: 'US',
  latitude: null,
  longitude: null,
  google_place_id: '',
  formatted_address: '',
  address_verified: false,
  notes: '',
}

const inputCls =
  'w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition outline-none'
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5'

interface Props {
  mode: 'new' | 'edit'
  clientId?: string
  initial?: CustomerFormValues
  onSaved: (id: string) => void
  onCancel: () => void
}

export default function CustomerForm({ mode, clientId, initial, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<CustomerFormValues>(initial || EMPTY_CUSTOMER)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState<{ verified: boolean; available: boolean; msg: string } | null>(null)

  const set = <K extends keyof CustomerFormValues>(k: K, v: CustomerFormValues[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const onAddressSelect = (a: ParsedAddress) => {
    setValidation(null)
    setForm(prev => ({
      ...prev,
      address_line1: a.line1 || prev.address_line1,
      city: a.city || prev.city,
      state: a.state || prev.state,
      zip_code: a.postal_code || prev.zip_code,
      county: a.county || prev.county,
      country: a.country || prev.country,
      latitude: a.latitude ?? prev.latitude,
      longitude: a.longitude ?? prev.longitude,
      google_place_id: a.place_id || prev.google_place_id,
      formatted_address: a.formatted || prev.formatted_address,
      address_verified: false,
    }))
  }

  const validateAddress = async () => {
    if (!form.address_line1) return
    setValidating(true)
    setValidation(null)
    const r = await apiFetch<{
      verified: boolean; available: boolean; formatted?: string | null
      latitude?: number | null; longitude?: number | null; place_id?: string | null
    }>('/api/v1/address/validate', {
      method: 'POST',
      body: JSON.stringify({
        address_line1: form.address_line1,
        address_line2: form.address_line2,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        country: form.country || 'US',
      }),
    })
    setValidating(false)
    const d = r.data
    if (!d) {
      setValidation({ verified: false, available: false, msg: 'Could not reach the validation service.' })
      return
    }
    if (!d.available) {
      setValidation({ verified: false, available: false, msg: 'Address validation is not configured (no Google key). Saved as entered.' })
      return
    }
    setForm(prev => ({
      ...prev,
      address_verified: d.verified,
      formatted_address: d.formatted || prev.formatted_address,
      latitude: d.latitude ?? prev.latitude,
      longitude: d.longitude ?? prev.longitude,
      google_place_id: d.place_id || prev.google_place_id,
    }))
    setValidation({
      verified: d.verified,
      available: true,
      msg: d.verified ? 'Address verified by Google.' : 'Google could not fully verify this address — double-check it.',
    })
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t])
    setTagInput('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const isCompany = form.client_type === 'company'
    if (isCompany && !form.company_name.trim()) { setError('Company name is required.'); return }
    if (!isCompany && (!form.first_name.trim() || !form.last_name.trim())) {
      setError('First and last name are required.'); return
    }
    setSaving(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('You must be logged in.'); setSaving(false); return }

    const payload = {
      contractor_id: session.user.id,
      client_type: form.client_type,
      company_name: form.company_name.trim() || null,
      first_name: (form.first_name.trim() || (isCompany ? form.company_name.trim() : '')),
      last_name: form.last_name.trim() || (isCompany ? '' : ''),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      lifecycle_status: form.lifecycle_status,
      lead_source: form.lead_source || null,
      tags: form.tags,
      address_line1: form.address_line1.trim() || null,
      address_line2: form.address_line2.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      zip_code: form.zip_code.trim() || null,
      county: form.county.trim() || null,
      country: form.country.trim() || 'US',
      latitude: form.latitude,
      longitude: form.longitude,
      google_place_id: form.google_place_id || null,
      formatted_address: form.formatted_address || null,
      address_verified: form.address_verified,
      address_verified_at: form.address_verified ? new Date().toISOString() : null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }

    if (mode === 'new') {
      const { data, error: err } = await supabase.from('clients').insert(payload).select('id').single()
      setSaving(false)
      if (err) { setError(err.message); return }
      onSaved(data!.id)
    } else {
      const { error: err } = await supabase.from('clients').update(payload).eq('id', clientId!)
      setSaving(false)
      if (err) { setError(err.message); return }
      onSaved(clientId!)
    }
  }

  const isCompany = form.client_type === 'company'

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 md:p-8 shadow-sm space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      {/* Record type */}
      <div>
        <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-3">Record Type</h3>
        <div className="flex gap-2">
          {(['individual', 'company'] as const).map(t => (
            <button type="button" key={t} onClick={() => set('client_type', t)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${
                form.client_type === t
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>
              {t === 'individual' ? <User size={14} /> : <Building2 size={14} />}
              {titleCase(t)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Identity + contact */}
        <div className="space-y-5">
          <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide">
            {isCompany ? 'Company Details' : 'Personal Details'}
          </h3>
          {isCompany && (
            <div>
              <label className={labelCls}>Company Name *</label>
              <input value={form.company_name} onChange={e => set('company_name', e.target.value)}
                className={inputCls} placeholder="Acme Properties LLC" />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{isCompany ? 'Contact First Name' : 'First Name *'}</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                className={inputCls} placeholder="John" />
            </div>
            <div>
              <label className={labelCls}>{isCompany ? 'Contact Last Name' : 'Last Name *'}</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                className={inputCls} placeholder="Smith" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} type="tel"
              className={inputCls} placeholder="(801) 555-0100" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input value={form.email} onChange={e => set('email', e.target.value)} type="email"
              className={inputCls} placeholder="customer@example.com" />
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <input value={form.website} onChange={e => set('website', e.target.value)}
              className={inputCls} placeholder="https://example.com" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Lifecycle Status</label>
              <select value={form.lifecycle_status} onChange={e => set('lifecycle_status', e.target.value)}
                className={inputCls}>
                {LIFECYCLE_STATUSES.map(s => (
                  <option key={s} value={s}>{LIFECYCLE_META[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Lead Source</label>
              <select value={form.lead_source} onChange={e => set('lead_source', e.target.value)}
                className={inputCls}>
                <option value="">—</option>
                {LEAD_SOURCES.map(s => <option key={s} value={s}>{titleCase(s)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-semibold px-2 py-1 rounded-full">
                  {t}
                  <button type="button" onClick={() => set('tags', form.tags.filter(x => x !== t))}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              className={inputCls} placeholder="Type a tag and press Enter (e.g. VIP, Commercial)" />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-5">
          <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide">Primary Address</h3>
          <div>
            <label className={labelCls}>Address Line 1</label>
            <AddressAutocomplete
              value={form.address_line1}
              onChange={v => setForm(prev => ({ ...prev, address_line1: v, address_verified: false }))}
              onSelect={onAddressSelect}
              className={inputCls}
              placeholder="123 Main St" />
          </div>
          <div>
            <label className={labelCls}>Address Line 2</label>
            <input value={form.address_line2} onChange={e => set('address_line2', e.target.value)}
              className={inputCls} placeholder="Apt, Suite, Unit..." />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)}
                className={inputCls} placeholder="Salt Lake City" />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input value={form.state} onChange={e => set('state', e.target.value)} maxLength={2}
                className={inputCls} placeholder="UT" />
            </div>
            <div>
              <label className={labelCls}>ZIP</label>
              <input value={form.zip_code} onChange={e => set('zip_code', e.target.value)}
                className={inputCls} placeholder="84101" />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={validateAddress} disabled={validating || !form.address_line1}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition disabled:opacity-50">
              <ShieldCheck size={13} /> {validating ? 'Validating…' : 'Validate with Google'}
            </button>
            {form.address_verified && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                <ShieldCheck size={12} /> Verified
              </span>
            )}
          </div>
          {validation && (
            <p className={`text-xs flex items-center gap-1.5 ${validation.verified ? 'text-green-700' : 'text-amber-700'}`}>
              {validation.verified ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
              {validation.msg}
            </p>
          )}

          {(form.latitude != null || form.address_line1) && (
            <AddressMapPreview
              latitude={form.latitude}
              longitude={form.longitude}
              address={[form.address_line1, form.city, form.state].filter(Boolean).join(', ')}
            />
          )}

          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={4}
              className={`${inputCls} resize-none`}
              placeholder="Gate codes, pet info, special instructions..." />
          </div>
        </div>
      </div>

      <div className="flex gap-3 max-w-md">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-3.5 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">
          <Plus size={15} />
          {saving ? 'Saving…' : mode === 'new' ? 'Create Customer' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
