'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Phone, Mail, MapPin, Globe, FileText, Tag, Calendar,
  Trash2, Save, X, Ban,
} from 'lucide-react'
import { crmAPI, formatDateTime } from '@/lib/crm-client'
import type { Activity, Deal, ImportedContractor, PipelineStage } from '@/lib/crm-types'
import ActivityComposer from './ActivityComposer'
import ActivityTimeline from './ActivityTimeline'
import DealEditor from './DealEditor'
import MessageComposer from './MessageComposer'

const CONTACT_STATUSES = [
  { value: '', label: '— Not set —' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'unqualified', label: 'Unqualified' },
  { value: 'do_not_contact', label: 'Do not contact' },
]

export default function ContractorDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const [contractor, setContractor] = useState<ImportedContractor | null>(null)
  const [deal, setDeal] = useState<Deal | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<ImportedContractor>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [{ contractor, deal, activities }, { stages }] = await Promise.all([
          crmAPI.contractors.get(id),
          crmAPI.stages(),
        ])
        if (cancelled) return
        setContractor(contractor); setDeal(deal); setActivities(activities)
        setForm(contractor); setStages(stages)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  const save = async () => {
    if (!contractor) return
    setSaving(true)
    try {
      const { contractor: updated } = await crmAPI.contractors.patch(id, form)
      setContractor(updated); setForm(updated); setEditing(false)
    } catch (e) { alert((e as Error).message) }
    finally { setSaving(false) }
  }

  const remove = async () => {
    if (!confirm('Delete this contractor? This also removes their deal and activities.')) return
    try {
      await crmAPI.contractors.remove(id)
      router.replace('/crm/contractors')
    } catch (e) { alert((e as Error).message) }
  }

  const toggleDoNotContact = async () => {
    if (!contractor) return
    const isDNC = contractor.contact_status === 'do_not_contact'
    if (!isDNC && !confirm('Mark this contractor as DO NOT CONTACT? They will be excluded from outreach.')) return
    try {
      const { contractor: updated } = await crmAPI.contractors.patch(id, {
        contact_status: isDNC ? 'new' : 'do_not_contact',
      })
      setContractor(updated); setForm(updated)
    } catch (e) { alert((e as Error).message) }
  }

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>
  if (error) return <div className="text-sm text-rose-600">{error}</div>
  if (!contractor) return <div className="text-sm text-gray-500">Not found.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            const saved = typeof window !== 'undefined'
              ? sessionStorage.getItem('crm:contractors:lastList') : null
            router.push(saved ? `/crm/contractors?${saved}` : '/crm/contractors')
          }}
          className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 font-semibold"
        >
          <ArrowLeft size={14} /> All contractors
        </button>
        <div className="flex gap-2">
          <button
            onClick={toggleDoNotContact}
            className={
              contractor.contact_status === 'do_not_contact'
                ? 'text-sm font-bold border border-rose-600 bg-rose-600 text-white hover:bg-rose-700 px-3 py-1.5 rounded-lg flex items-center gap-1 uppercase tracking-wider'
                : 'text-sm font-bold border border-rose-200 text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg flex items-center gap-1 uppercase tracking-wider'
            }
            title={
              contractor.contact_status === 'do_not_contact'
                ? 'Currently marked DO NOT CONTACT — click to remove'
                : 'Mark this contractor as DO NOT CONTACT'
            }
          >
            <Ban size={14} /> Do not contact
          </button>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm font-bold border border-gray-200 hover:border-teal-500 text-gray-700 px-3 py-1.5 rounded-lg"
            >Edit info</button>
          )}
          <button
            onClick={remove}
            className="text-sm font-bold border border-rose-200 text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg flex items-center gap-1"
          ><Trash2 size={14} /> Delete</button>
        </div>
      </div>

      <header className="bg-white border border-gray-200 rounded-xl p-5">
        {!editing && (
          <>
            <h1 className="text-2xl font-bold text-gray-900">{contractor.business_name || 'Unnamed'}</h1>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700">
              {contractor.phone && (
                <a href={`tel:${contractor.phone}`} className="flex items-center gap-1.5 hover:text-teal-700">
                  <Phone size={14} className="text-gray-400" /> {contractor.phone}
                </a>
              )}
              {contractor.email && (
                <a href={`mailto:${contractor.email}`} className="flex items-center gap-1.5 hover:text-teal-700">
                  <Mail size={14} className="text-gray-400" /> {contractor.email}
                </a>
              )}
              {(contractor.address || contractor.city) && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-gray-400" />
                  {[contractor.address, contractor.city, contractor.state, contractor.zip].filter(Boolean).join(', ')}
                </span>
              )}
              {contractor.website && (
                <a href={contractor.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-teal-700">
                  <Globe size={14} className="text-gray-400" /> {contractor.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {contractor.license_number && (
                <Badge label={`Lic ${contractor.license_number}`}
                  tone={contractor.license_status?.toLowerCase() === 'active' ? 'good' : 'neutral'}
                />
              )}
              {contractor.license_status && <Badge label={contractor.license_status} />}
              {contractor.contact_status && <Badge label={contractor.contact_status.replace(/_/g, ' ')} tone="info" />}
              {contractor.source && <Badge label={`source: ${contractor.source}`} tone="muted" />}
              {Array.isArray(contractor.specialties) && contractor.specialties.map((s, i) => (
                <Badge key={i} label={s} tone="muted" />
              ))}
            </div>
          </>
        )}

        {editing && (
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <FormField label="Business name">
                <input type="text" value={form.business_name || ''} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className={inputCls} />
              </FormField>
              <FormField label="Contact status">
                <select value={form.contact_status || ''} onChange={(e) => setForm({ ...form, contact_status: e.target.value || null })} className={inputCls}>
                  {CONTACT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </FormField>
              <FormField label="Phone">
                <input type="tel" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
              </FormField>
              <FormField label="Email">
                <input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
              </FormField>
              <FormField label="Website">
                <input type="url" value={form.website || ''} onChange={(e) => setForm({ ...form, website: e.target.value })} className={inputCls} />
              </FormField>
              <FormField label="Source">
                <input type="text" value={form.source || ''} onChange={(e) => setForm({ ...form, source: e.target.value })} className={inputCls} />
              </FormField>
              <FormField label="Address">
                <input type="text" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} />
              </FormField>
              <FormField label="City">
                <input type="text" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
              </FormField>
              <FormField label="State">
                <input type="text" value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputCls} />
              </FormField>
              <FormField label="Zip">
                <input type="text" value={form.zip || ''} onChange={(e) => setForm({ ...form, zip: e.target.value })} className={inputCls} />
              </FormField>
              <FormField label="License #">
                <input type="text" value={form.license_number || ''} onChange={(e) => setForm({ ...form, license_number: e.target.value })} className={inputCls} />
              </FormField>
              <FormField label="License status">
                <input type="text" value={form.license_status || ''} onChange={(e) => setForm({ ...form, license_status: e.target.value })} className={inputCls} />
              </FormField>
            </div>
            <FormField label="Notes">
              <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={3} />
            </FormField>

            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5">
                <Save size={14} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditing(false); setForm(contractor) }} className="border border-gray-200 text-gray-700 text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5">
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-gray-900">Reach out</h2>
          <MessageComposer
            contractor={contractor}
            onActivity={(a) => setActivities([a, ...activities])}
          />

          <h2 className="font-bold text-gray-900 pt-2">Log a touch</h2>
          <ActivityComposer
            contractorId={id}
            onCreated={(a) => setActivities([a, ...activities])}
          />
          <ActivityTimeline activities={activities} onChange={setActivities} />
        </div>

        <aside className="space-y-4">
          <DealEditor
            contractorId={id} deal={deal} stages={stages}
            onChange={(d) => setDeal(d)}
          />

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <FileText size={14} className="text-gray-500" /> Notes
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap min-h-[3rem]">
              {contractor.notes || <span className="text-gray-400">No notes yet — click "Edit info" to add some.</span>}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2 text-xs text-gray-500">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Tag size={14} className="text-gray-500" /> Record
            </h3>
            <p className="flex items-center gap-1.5"><Calendar size={11} /> Imported {formatDateTime(contractor.created_at)}</p>
            {contractor.scraped_at && (
              <p className="flex items-center gap-1.5"><Calendar size={11} /> Scraped {formatDateTime(contractor.scraped_at)}</p>
            )}
            <p className="flex items-center gap-1.5"><Calendar size={11} /> Updated {formatDateTime(contractor.updated_at)}</p>
            {contractor.contact_date && (
              <p className="flex items-center gap-1.5"><Calendar size={11} /> Last contact {formatDateTime(contractor.contact_date)}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

const inputCls = 'w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500'

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  )
}

function Badge({
  label, tone = 'neutral',
}: {
  label: string
  tone?: 'good' | 'neutral' | 'info' | 'muted'
}) {
  const cls = tone === 'good' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : tone === 'info' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : tone === 'muted' ? 'bg-gray-50 text-gray-500 border-gray-200'
    : 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
      {label}
    </span>
  )
}
