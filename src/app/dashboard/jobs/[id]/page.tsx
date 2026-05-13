'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Edit2, Save, X, Plus, Trash2, FileText, FileSignature, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import Breadcrumbs from '../../../../components/Breadcrumbs'
import ContractFormModal from '../../../../components/contracts/ContractFormModal'
import { supabase } from '../../../../lib/supabase-client'
import { markJobsChanged } from '../../../../lib/data-events'

type JobStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'

interface LineItem {
  id: string | number
  description: string
  qty: number
  unit: string
  rate: number
}

interface Job {
  id: string
  title: string
  status: JobStatus
  stage: string | null
  priority: string | null
  trade: string | null
  lead_source: string | null
  site_address: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  estimated_duration: string | null
  estimated_value: number | null
  description: string | null
  technician_id: string | null
  client_id: string | null
  contractor_id: string
  clients: { id: string; first_name: string; last_name: string; email: string | null; phone: string | null } | null
  technicians: { id: string; name: string } | null
}

interface Technician {
  id: string
  name: string
}

const STATUS_COLORS: Record<JobStatus, { bg: string; text: string; dot: string; label: string }> = {
  pending:     { bg: 'bg-yellow-50',  text: 'text-yellow-700', dot: 'bg-yellow-400', label: 'Pending' },
  assigned:    { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500',   label: 'Assigned' },
  in_progress: { bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-500', label: 'In Progress' },
  completed:   { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500',  label: 'Completed' },
  cancelled:   { bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400',   label: 'Cancelled' },
}

const inputCls = 'w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition'
const labelCls = 'block text-xs font-semibold text-gray-500 mb-1.5'

export default function JobDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" /></div>}>
      <JobDetail params={params} />
    </Suspense>
  )
}

function JobDetail({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const searchParams = useSearchParams()
  const [job, setJob] = useState<Job | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(searchParams.get('edit') === '1')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string>('')

  // Edit form state
  const [form, setForm] = useState({
    title: '',
    status: 'pending' as JobStatus,
    stage: '',
    priority: '',
    trade: '',
    lead_source: '',
    site_address: '',
    scheduled_start: '',
    estimated_duration: '',
    description: '',
    technician_id: '',
  })
  const [editItems, setEditItems] = useState<LineItem[]>([])

  // Contract modal + existing-contract lookup
  const [contractModalOpen, setContractModalOpen] = useState(false)
  const [existingContractId, setExistingContractId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*, clients(id, first_name, last_name, email, phone), technicians(id, name)')
      .eq('id', id)
      .single()

    const { data: items } = await supabase
      .from('job_line_items')
      .select('id, description, qty, unit, rate')
      .eq('job_id', id)
      .order('id')

    const { data: contractRow } = await supabase
      .from('contracts')
      .select('id')
      .eq('job_id', id)
      .neq('status', 'cancelled')
      .limit(1)
      .maybeSingle()
    setExistingContractId(contractRow?.id ?? null)

    const { data: techs } = await supabase
      .from('technicians')
      .select('id, name')
      .eq('is_active', true)
      .order('name')

    if (jobData) {
      setJob(jobData as unknown as Job)
      setForm({
        title: jobData.title || '',
        status: (jobData.status || 'pending') as JobStatus,
        stage: jobData.stage || '',
        priority: jobData.priority || '',
        trade: jobData.trade || '',
        lead_source: jobData.lead_source || '',
        site_address: jobData.site_address || '',
        scheduled_start: jobData.scheduled_start ? jobData.scheduled_start.slice(0, 16) : '',
        estimated_duration: jobData.estimated_duration || '',
        description: jobData.description || '',
        technician_id: jobData.technician_id || '',
      })
    }
    if (items) {
      setLineItems(items)
      setEditItems(items.map(i => ({ ...i })))
    }
    if (techs) setTechnicians(techs)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const subtotal = editItems.reduce((s, i) => s + i.qty * i.rate, 0)
  const viewSubtotal = lineItems.reduce((s, i) => s + i.qty * i.rate, 0)

  const addItem = () => setEditItems(prev => [...prev, { id: Date.now(), description: '', qty: 1, unit: 'ea', rate: 0 }])
  const removeItem = (id: string | number) => setEditItems(prev => prev.filter(i => i.id !== id))
  const updateItem = (id: string | number, field: keyof LineItem, value: string | number) =>
    setEditItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))

  const handleSave = async () => {
    if (!job) return
    setSaving(true)
    setSaveError('')

    const { error: jobErr } = await supabase.from('jobs').update({
      title: form.title.trim(),
      status: form.status,
      stage: form.stage || null,
      priority: form.priority || null,
      trade: form.trade.trim() || null,
      lead_source: form.lead_source.trim() || null,
      site_address: form.site_address.trim() || null,
      scheduled_start: form.scheduled_start ? new Date(form.scheduled_start).toISOString() : null,
      estimated_duration: form.estimated_duration.trim() || null,
      description: form.description.trim() || null,
      technician_id: form.technician_id || null,
      estimated_value: subtotal || job.estimated_value,
    }).eq('id', id)

    if (jobErr) {
      // Surface the underlying reason — most often an RLS denial or a
      // network failure — so users don't think their click did nothing.
      setSaveError(`Couldn't save: ${jobErr.message || 'unknown error'}`)
      setSaving(false)
      return
    }

    // Delete existing line items and re-insert
    const { error: delErr } = await supabase.from('job_line_items').delete().eq('job_id', id)
    if (delErr) {
      setSaveError(`Saved core fields but couldn't refresh line items: ${delErr.message}`)
      await load()
      markJobsChanged()
      setEditing(false)
      setSaving(false)
      return
    }

    const validItems = editItems.filter(i => i.description.trim())
    if (validItems.length > 0) {
      const { error: insErr } = await supabase.from('job_line_items').insert(
        validItems.map(i => ({
          job_id: id,
          description: i.description.trim(),
          qty: i.qty,
          unit: i.unit,
          rate: i.rate,
        }))
      )
      if (insErr) {
        setSaveError(`Saved core fields but couldn't add line items: ${insErr.message}`)
        await load()
        markJobsChanged()
        setEditing(false)
        setSaving(false)
        return
      }
    }

    await load()
    markJobsChanged()
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const cancelEdit = () => {
    if (!job) return
    setForm({
      title: job.title || '',
      status: (job.status || 'pending') as JobStatus,
      stage: job.stage || '',
      priority: job.priority || '',
      trade: job.trade || '',
      lead_source: job.lead_source || '',
      site_address: job.site_address || '',
      scheduled_start: job.scheduled_start ? job.scheduled_start.slice(0, 16) : '',
      estimated_duration: job.estimated_duration || '',
      description: job.description || '',
      technician_id: job.technician_id || '',
    })
    setEditItems(lineItems.map(i => ({ ...i })))
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Job not found.</p>
          <Link href="/dashboard/jobs" className="text-teal-600 font-semibold text-sm hover:underline">← Back to Jobs</Link>
        </div>
      </div>
    )
  }

  const status = STATUS_COLORS[job.status] || STATUS_COLORS.pending
  const customerName = job.clients ? `${job.clients.first_name} ${job.clients.last_name}` : '—'

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[
        { label: 'Jobs', href: '/dashboard/jobs' },
        { label: job.title, href: `/dashboard/jobs/${id}` },
      ]} />

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {saveError}
          </div>
        )}
        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <button onClick={() => router.back()} className="mt-1 p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} /> {status.label}
              </span>
              {job.priority && (
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{job.priority} priority</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 truncate">{job.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Customer: <span className="font-semibold text-gray-700">{customerName}</span></p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saved && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                <CheckCircle2 size={13} /> Saved
              </span>
            )}
            {!editing ? (
              <>
                <Link href={`/dashboard/invoices/new?job_id=${id}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                  <FileText size={13} /> Create Invoice
                </Link>
                {existingContractId ? (
                  <Link href={`/dashboard/contracts/${existingContractId}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                    <FileSignature size={13} /> View Contract
                  </Link>
                ) : (
                  <button onClick={() => setContractModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                    <FileSignature size={13} /> Create Contract
                  </button>
                )}
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition">
                  <Edit2 size={13} /> Edit
                </button>
              </>
            ) : (
              <>
                <button onClick={cancelEdit}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
                  <X size={13} /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50">
                  <Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* ── Job Details ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-5">Job Details</h2>

            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelCls}>Job Title</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as JobStatus }))} className={inputCls}>
                    {Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Stage</label>
                  <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))} className={inputCls}>
                    <option value="">— None —</option>
                    {['Lead', 'Quoted', 'Active', 'Completed'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Trade / Specialty</label>
                  <input value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))} className={inputCls} placeholder="Plumbing, HVAC…" />
                </div>
                <div>
                  <label className={labelCls}>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={inputCls}>
                    <option value="">— None —</option>
                    {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Technician</label>
                  <select value={form.technician_id} onChange={e => setForm(f => ({ ...f, technician_id: e.target.value }))} className={inputCls}>
                    <option value="">Unassigned</option>
                    {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Scheduled Start</label>
                  <input type="datetime-local" value={form.scheduled_start} onChange={e => setForm(f => ({ ...f, scheduled_start: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Duration</label>
                  <input value={form.estimated_duration} onChange={e => setForm(f => ({ ...f, estimated_duration: e.target.value }))} className={inputCls} placeholder="2 hours, half day…" />
                </div>
                <div>
                  <label className={labelCls}>Lead Source</label>
                  <select value={form.lead_source} onChange={e => setForm(f => ({ ...f, lead_source: e.target.value }))} className={inputCls}>
                    <option value="">— None —</option>
                    {['Referral', 'Website', 'Google', 'Nextdoor', 'Yelp', 'Facebook', 'Repeat Customer', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Site Address</label>
                  <input value={form.site_address} onChange={e => setForm(f => ({ ...f, site_address: e.target.value }))} className={inputCls} placeholder="123 Main St, City, ST" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Notes / Scope of Work</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4}
                    className={`${inputCls} resize-none`} placeholder="Describe the work to be done…" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                <Detail label="Customer" value={customerName} />
                {job.clients?.phone && <Detail label="Customer Phone" value={job.clients.phone} />}
                {job.clients?.email && <Detail label="Customer Email" value={job.clients.email} />}
                <Detail label="Trade" value={job.trade} />
                <Detail label="Stage" value={job.stage} />
                <Detail label="Priority" value={job.priority} />
                <Detail label="Technician" value={job.technicians?.name} />
                <Detail label="Lead Source" value={job.lead_source} />
                <Detail label="Duration" value={job.estimated_duration} />
                {job.scheduled_start && (
                  <Detail label="Scheduled" value={new Date(job.scheduled_start).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} />
                )}
                {job.site_address && (
                  <div className="col-span-2 md:col-span-3">
                    <Detail label="Site Address" value={job.site_address} />
                  </div>
                )}
                {job.description && (
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes / Scope</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Line Items / Bid ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-5">Bid / Line Items</h2>

            {editing ? (
              <>
                <div className="hidden md:grid grid-cols-12 gap-3 px-1 mb-2">
                  <p className="col-span-5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Description</p>
                  <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</p>
                  <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</p>
                  <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate ($)</p>
                </div>
                <div className="space-y-3">
                  {editItems.map(item => (
                    <div key={item.id} className="grid grid-cols-12 gap-3 items-center">
                      <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                        className="col-span-12 md:col-span-5 bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                        placeholder="Description" />
                      <input type="number" min="0" step="0.5" value={item.qty}
                        onChange={e => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                        className="col-span-4 md:col-span-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 outline-none text-center" />
                      <select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}
                        className="col-span-4 md:col-span-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 outline-none">
                        {['ea','hr','sqft','lft','day','lot'].map(u => <option key={u}>{u}</option>)}
                      </select>
                      <input type="number" min="0" step="0.01" value={item.rate}
                        onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="col-span-3 md:col-span-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 outline-none text-right"
                        placeholder="0.00" />
                      <button onClick={() => removeItem(item.id)} className="col-span-1 flex justify-center text-gray-300 hover:text-red-500 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={addItem}
                  className="mt-4 flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700 transition">
                  <Plus size={14} /> Add Line Item
                </button>
                <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
                  <div className="w-56 flex justify-between text-sm font-bold">
                    <span className="text-gray-600">Estimated Total</span>
                    <span className="text-teal-600">${subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </>
            ) : lineItems.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No line items yet. Click Edit to add services.</p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Description</th>
                      <th className="text-right py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-16">Qty</th>
                      <th className="text-right py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-16">Unit</th>
                      <th className="text-right py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-24">Rate</th>
                      <th className="text-right py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-24">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map(item => (
                      <tr key={item.id} className="border-b border-gray-50">
                        <td className="py-3 text-gray-800">{item.description}</td>
                        <td className="py-3 text-right text-gray-600">{item.qty}</td>
                        <td className="py-3 text-right text-gray-500">{item.unit}</td>
                        <td className="py-3 text-right text-gray-600">${Number(item.rate).toFixed(2)}</td>
                        <td className="py-3 text-right font-semibold text-gray-900">${(item.qty * item.rate).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex justify-end">
                  <div className="w-56 flex justify-between text-sm font-bold border-t border-gray-200 pt-3">
                    <span className="text-gray-700">Estimated Total</span>
                    <span className="text-teal-600">${viewSubtotal.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3 pb-8">
            <Link href="/dashboard/jobs" className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              ← Back to Jobs
            </Link>
            <div className="flex-1" />
            <Link href={`/dashboard/invoices/new?job_id=${id}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-sm font-semibold hover:bg-teal-100 transition">
              <FileText size={14} /> Convert to Invoice
            </Link>
          </div>
        </div>
      </div>

      <ContractFormModal
        jobId={id}
        open={contractModalOpen}
        onClose={() => setContractModalOpen(false)}
        onCreated={createdId => setExistingContractId(createdId)}
      />
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  )
}
