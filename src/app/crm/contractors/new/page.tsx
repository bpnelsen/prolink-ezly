'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { crmAPI } from '@/lib/crm-client'
import type { ImportedContractor } from '@/lib/crm-types'

const inputCls = 'w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500'

export default function NewContractorPage() {
  const router = useRouter()
  const [form, setForm] = useState<Partial<ImportedContractor>>({ contact_status: 'new', source: 'manual' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof ImportedContractor, v: any) => setForm({ ...form, [k]: v })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.business_name?.trim()) { setError('Business name is required'); return }
    setSaving(true); setError(null)
    try {
      const { contractor } = await crmAPI.contractors.create(form)
      router.replace(`/crm/contractors/${contractor.id}`)
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/crm/contractors" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 font-semibold">
        <ArrowLeft size={14} /> All contractors
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Add contractor</h1>

      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <Field label="Business name *">
          <input type="text" required value={form.business_name || ''} onChange={(e) => set('business_name', e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><input type="tel" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} /></Field>
          <Field label="Email"><input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Website"><input type="url" value={form.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://" className={inputCls} /></Field>
        <Field label="Address"><input type="text" value={form.address || ''} onChange={(e) => set('address', e.target.value)} className={inputCls} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="City"><input type="text" value={form.city || ''} onChange={(e) => set('city', e.target.value)} className={inputCls} /></Field>
          <Field label="State"><input type="text" value={form.state || ''} onChange={(e) => set('state', e.target.value)} maxLength={2} className={inputCls} /></Field>
          <Field label="Zip"><input type="text" value={form.zip || ''} onChange={(e) => set('zip', e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="License #"><input type="text" value={form.license_number || ''} onChange={(e) => set('license_number', e.target.value)} className={inputCls} /></Field>
          <Field label="License status"><input type="text" value={form.license_status || ''} onChange={(e) => set('license_status', e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source"><input type="text" value={form.source || ''} onChange={(e) => set('source', e.target.value)} className={inputCls} /></Field>
          <Field label="Contact status">
            <select value={form.contact_status || ''} onChange={(e) => set('contact_status', e.target.value)} className={inputCls}>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="unqualified">Unqualified</option>
              <option value="do_not_contact">Do not contact</option>
            </select>
          </Field>
        </div>
        <Field label="Notes"><textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} rows={3} className={inputCls} /></Field>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-lg">
            {saving ? 'Saving…' : 'Create contractor'}
          </button>
          <Link href="/crm/contractors" className="border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-bold px-4 py-2 rounded-lg">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  )
}
