'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, Search, FileText, Briefcase, ArrowLeft, Eye, X as XIcon } from 'lucide-react'
import Breadcrumbs from '../../../../components/Breadcrumbs'
import { supabase } from '../../../../lib/supabase-client'

interface Client {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
}

interface Job {
  id: string
  title: string
  client_id: string | null
  estimated_value: number | null
  status: string | null
}

interface JobLineItem {
  description: string
  qty: number
  unit: string
  rate: number
}

interface LineItem {
  id: number
  description: string
  qty: number
  unit: string
  rate: number
}

const TYPES = [
  { id: 'one_time', label: 'One-time Invoice' },
  { id: 'milestone', label: 'Milestone Billing' },
  { id: 'recurring', label: 'Recurring' },
  { id: 'maintenance', label: 'Maintenance Plan' },
]

const RECURRENCE = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'semi_annual', label: 'Every 6 Months' },
  { id: 'annual', label: 'Yearly' },
]

export default function NewInvoicePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    }>
      <NewInvoice />
    </Suspense>
  )
}

function NewInvoice() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobIdFromQuery = searchParams.get('job_id')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  const [invoiceType, setInvoiceType] = useState('one_time')
  const [milestoneLabel, setMilestoneLabel] = useState('')
  const [recurrence, setRecurrence] = useState('monthly')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10)
  })
  const [taxRate, setTaxRate] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('Payment due within 30 days of receipt.')

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: 1, description: '', qty: 1, unit: 'ea', rate: 0 },
  ])
  const [showPreview, setShowPreview] = useState(false)

  // Fetch clients + completed jobs
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const [{ data: clientData }, { data: jobData }] = await Promise.all([
        supabase
          .from('clients')
          .select('id, first_name, last_name, phone, email')
          .eq('contractor_id', session.user.id)
          .neq('is_deleted', true)
          .order('first_name'),
        supabase
          .from('jobs')
          .select('id, title, client_id, estimated_value, status')
          .eq('contractor_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(100),
      ])

      if (clientData) setClients(clientData)
      if (jobData) setJobs(jobData)

      // Auto-fill from job_id query param
      if (jobIdFromQuery && jobData) {
        const job = jobData.find(j => j.id === jobIdFromQuery)
        if (job) {
          await loadJob(job, clientData || [])
        }
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIdFromQuery])

  const loadJob = async (job: Job, clientsList: Client[] = clients) => {
    setSelectedJob(job)
    if (job.client_id) {
      const c = clientsList.find(c => c.id === job.client_id)
      if (c) {
        setSelectedClient(c)
        setClientSearch(`${c.first_name} ${c.last_name}`)
      }
    }

    // Load job line items
    const { data: jobItems } = await supabase
      .from('job_line_items')
      .select('description, qty, unit, rate')
      .eq('job_id', job.id)

    if (jobItems && jobItems.length > 0) {
      setLineItems(jobItems.map((item: JobLineItem, i: number) => ({
        id: i + 1,
        description: item.description || '',
        qty: Number(item.qty) || 1,
        unit: item.unit || 'ea',
        rate: Number(item.rate) || 0,
      })))
    } else if (job.estimated_value) {
      setLineItems([{
        id: 1,
        description: job.title || 'Service',
        qty: 1,
        unit: 'lot',
        rate: Number(job.estimated_value) || 0,
      }])
    }
  }

  const filteredClients = clients.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone?.includes(clientSearch)
  )

  const filteredJobs = selectedClient
    ? jobs.filter(j => j.client_id === selectedClient.id)
    : jobs.filter(j => j.status === 'completed').slice(0, 10)

  const addLineItem = () => {
    setLineItems(prev => [...prev, { id: Date.now(), description: '', qty: 1, unit: 'ea', rate: 0 }])
  }
  const removeLineItem = (id: number) => {
    setLineItems(prev => prev.filter(i => i.id !== id))
  }
  const updateLineItem = (id: number, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const subtotal = lineItems.reduce((sum, i) => sum + i.qty * i.rate, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount - discount

  const handleSave = async (sendNow: boolean) => {
    if (!selectedClient) { setError('Please select a customer'); return }
    if (lineItems.every(i => !i.description.trim())) { setError('Add at least one line item'); return }
    if (total <= 0) { setError('Invoice total must be greater than zero'); return }

    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')

      // Generate invoice number
      const { data: numData, error: numErr } = await supabase
        .rpc('next_invoice_number', { c_id: session.user.id })
      if (numErr) throw numErr

      const nextRecurrenceDate = invoiceType === 'recurring' || invoiceType === 'maintenance'
        ? (() => {
            const d = new Date(issueDate)
            if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1)
            else if (recurrence === 'quarterly') d.setMonth(d.getMonth() + 3)
            else if (recurrence === 'semi_annual') d.setMonth(d.getMonth() + 6)
            else if (recurrence === 'annual') d.setFullYear(d.getFullYear() + 1)
            return d.toISOString().slice(0, 10)
          })()
        : null

      const payload = {
        contractor_id: session.user.id,
        client_id: selectedClient.id,
        job_id: selectedJob?.id ?? null,
        invoice_number: numData,
        status: sendNow ? 'sent' : 'draft',
        invoice_type: invoiceType,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount_amount: discount,
        total,
        balance_due: total,
        issue_date: issueDate,
        due_date: dueDate,
        sent_at: sendNow ? new Date().toISOString() : null,
        milestone_label: invoiceType === 'milestone' ? milestoneLabel || null : null,
        is_recurring: invoiceType === 'recurring' || invoiceType === 'maintenance',
        recurrence_interval: invoiceType === 'recurring' || invoiceType === 'maintenance' ? recurrence : null,
        next_recurrence_date: nextRecurrenceDate,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
      }

      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert(payload)
        .select('id')
        .single()
      if (invErr) throw invErr

      // Insert line items
      const validItems = lineItems.filter(i => i.description.trim())
      if (validItems.length > 0 && invoice) {
        const { error: liErr } = await supabase.from('invoice_line_items').insert(
          validItems.map((i, idx) => ({
            invoice_id: invoice.id,
            description: i.description.trim(),
            qty: i.qty,
            unit: i.unit,
            rate: i.rate,
            unit_price: i.rate,
            amount: i.qty * i.rate,
            position: idx,
          }))
        )
        if (liErr) throw liErr
      }

      router.push(`/dashboard/invoices/${invoice.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string; details?: string })?.message
          || (err as { details?: string })?.details
          || JSON.stringify(err)
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[
        { label: 'Invoices', href: '/dashboard/invoices' },
        { label: 'New Invoice', href: '/dashboard/invoices/new' },
      ]} />

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Finance</p>
            <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        <div className="space-y-6">
          {/* Customer + Job */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-5">Customer & Job</h2>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Customer *</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3.5 text-gray-400" />
                  <input
                    value={clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setShowClientDropdown(true); setSelectedClient(null) }}
                    onFocus={() => setShowClientDropdown(true)}
                    className="w-full bg-gray-50 pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                    placeholder="Search by name, email, or phone..." />
                </div>
                {showClientDropdown && clientSearch && filteredClients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filteredClients.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => { setSelectedClient(c); setClientSearch(`${c.first_name} ${c.last_name}`); setShowClientDropdown(false) }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                        <p className="text-sm font-semibold text-gray-800">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-gray-400">{c.email || c.phone || ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedClient && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Link to Job (optional)</label>
                  <select
                    value={selectedJob?.id || ''}
                    onChange={e => {
                      const job = jobs.find(j => j.id === e.target.value)
                      if (job) loadJob(job)
                      else setSelectedJob(null)
                    }}
                    className="w-full bg-gray-50 px-3 py-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                    <option value="">No job linked (manual invoice)</option>
                    {filteredJobs.map(j => (
                      <option key={j.id} value={j.id}>
                        {j.title} {j.estimated_value ? `— $${Number(j.estimated_value).toLocaleString()}` : ''} {j.status ? `(${j.status})` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedJob && (
                    <p className="text-[10px] text-teal-600 mt-1.5 flex items-center gap-1">
                      <Briefcase size={10} /> Line items auto-filled from job
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Invoice Type */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-5">Invoice Type</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {TYPES.map(t => (
                <button key={t.id} type="button" onClick={() => setInvoiceType(t.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition ${
                    invoiceType === t.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {invoiceType === 'milestone' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Milestone Label</label>
                <input value={milestoneLabel} onChange={e => setMilestoneLabel(e.target.value)}
                  placeholder="e.g. Deposit (25%), Progress Payment, Final Payment"
                  className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
              </div>
            )}

            {(invoiceType === 'recurring' || invoiceType === 'maintenance') && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Billing Frequency</label>
                <select value={recurrence} onChange={e => setRecurrence(e.target.value)}
                  className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                  {RECURRENCE.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 mt-1.5">A new invoice will be created on the next billing date.</p>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-5">Dates</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Issue Date</label>
                <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                  className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-5">Line Items</h2>
            <div className="space-y-3">
              <div className="hidden md:grid grid-cols-12 gap-3 px-1">
                <p className="col-span-5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Description</p>
                <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</p>
                <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</p>
                <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate ($)</p>
                <p className="col-span-1" />
              </div>
              {lineItems.map(item => (
                <div key={item.id} className="grid grid-cols-12 gap-3 items-center">
                  <input value={item.description} onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                    className="col-span-12 md:col-span-5 bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="Description" />
                  <input type="number" min="0" step="0.5" value={item.qty}
                    onChange={e => updateLineItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                    className="col-span-4 md:col-span-2 bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
                  <select value={item.unit} onChange={e => updateLineItem(item.id, 'unit', e.target.value)}
                    className="col-span-4 md:col-span-2 bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                    <option value="ea">ea</option><option value="hr">hr</option>
                    <option value="sqft">sqft</option><option value="lft">lft</option>
                    <option value="day">day</option><option value="lot">lot</option>
                  </select>
                  <input type="number" min="0" step="0.01" value={item.rate}
                    onChange={e => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    className="col-span-3 md:col-span-2 bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="0.00" />
                  <button type="button" onClick={() => removeLineItem(item.id)}
                    className="col-span-1 flex justify-center text-gray-300 hover:text-red-500 transition">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addLineItem}
              className="mt-4 flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700 transition">
              <Plus size={14} /> Add Line Item
            </button>

            {/* Totals */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="ml-auto w-full md:w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Tax</span>
                    <input type="number" min="0" step="0.01" value={taxRate}
                      onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-16 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 text-xs text-right focus:border-teal-500" />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                  <span className="font-semibold text-gray-900">${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Discount</span>
                    <input type="number" min="0" step="0.01" value={discount}
                      onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-20 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 text-xs text-right focus:border-teal-500" />
                  </div>
                  <span className="font-semibold text-gray-900">-${discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-2">
                  <span className="text-gray-900">Total</span>
                  <span className="text-teal-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-5">Notes & Terms</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes for Customer</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                  placeholder="Optional message to customer..."
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Terms</label>
                <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={4}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 resize-none" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-8 flex-wrap">
            <button type="button" onClick={() => router.back()}
              className="px-6 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 px-5 py-3.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50">
              <Eye size={14} /> Preview Invoice
            </button>
            <div className="flex-1" />
            <button type="button" onClick={() => handleSave(false)} disabled={loading}
              className="px-6 py-3.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Draft'}
            </button>
            <button type="button" onClick={() => handleSave(true)} disabled={loading}
              className="flex items-center gap-1.5 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-sm disabled:opacity-50">
              <FileText size={14} /> {loading ? 'Creating...' : 'Save & Send'}
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Preview Slide-over */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/40" onClick={() => setShowPreview(false)} />
          {/* Panel */}
          <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <p className="font-bold text-gray-900">Invoice Preview</p>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-700 transition">
                <XIcon size={18} />
              </button>
            </div>
            {/* Preview content */}
            <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
              <div className="bg-white shadow-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
                {/* Header */}
                <div className="flex items-start justify-between p-8 pb-4 gap-6 flex-wrap">
                  <div>
                    <p className="text-xl font-bold text-gray-900">Your Business</p>
                    <p className="text-sm text-gray-500 mt-0.5">Preview — details from your profile will appear here</p>
                  </div>
                  <div className="border border-gray-300 text-xs min-w-[200px]">
                    <div className="flex">
                      <span className="px-3 py-2 font-bold text-gray-600 border-r border-gray-300 w-28">INVOICE</span>
                      <span className="px-3 py-2 text-gray-800">#DRAFT</span>
                    </div>
                    <div className="flex border-t border-gray-300">
                      <span className="px-3 py-2 font-bold text-gray-600 border-r border-gray-300 w-28">INVOICE DATE</span>
                      <span className="px-3 py-2 text-gray-800">{issueDate ? new Date(issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                    </div>
                    <div className="flex border-t border-gray-300">
                      <span className="px-3 py-2 font-bold text-gray-600 border-r border-gray-300 w-28">DUE</span>
                      <span className="px-3 py-2 text-gray-800">{dueDate ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Upon receipt'}</span>
                    </div>
                    <div className="flex border-t border-gray-300 bg-gray-50">
                      <span className="px-3 py-2 font-bold text-gray-600 border-r border-gray-300 w-28">AMOUNT DUE</span>
                      <span className="px-3 py-2 font-bold text-blue-600">${(subtotal + subtotal * (taxRate / 100) - discount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Bill to */}
                {selectedClient && (
                  <div className="px-8 pb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Bill To</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedClient.first_name} {selectedClient.last_name}</p>
                    {selectedClient.email && <p className="text-xs text-gray-500">{selectedClient.email}</p>}
                    {selectedClient.phone && <p className="text-xs text-gray-500">{selectedClient.phone}</p>}
                  </div>
                )}

                {/* Line items */}
                <div className="px-8 pb-8">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2">Invoice</p>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-600 text-white">
                        <th className="text-left px-3 py-2 font-semibold text-xs">Services</th>
                        <th className="text-right px-3 py-2 font-semibold text-xs w-12">Qty</th>
                        <th className="text-right px-3 py-2 font-semibold text-xs w-24">Unit Price</th>
                        <th className="text-right px-3 py-2 font-semibold text-xs w-24">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.filter(i => i.description.trim()).map((item, idx) => (
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2.5 text-gray-800">{item.description}</td>
                          <td className="px-3 py-2.5 text-right text-gray-600">{item.qty}</td>
                          <td className="px-3 py-2.5 text-right text-gray-600">${Number(item.rate).toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-gray-900">${(item.qty * item.rate).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="mt-4 flex justify-end">
                    <div className="w-56 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="font-semibold">${subtotal.toFixed(2)}</span>
                      </div>
                      {taxRate > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Tax ({taxRate}%)</span>
                          <span className="font-semibold">${(subtotal * taxRate / 100).toFixed(2)}</span>
                        </div>
                      )}
                      {discount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Discount</span>
                          <span className="font-semibold">−${discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold border-t border-gray-300 pt-2 text-base">
                        <span>Total</span>
                        <span className="text-blue-600">${(subtotal + subtotal * taxRate / 100 - discount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {notes && (
                    <div className="mt-6 p-3 bg-gray-50 border border-gray-200 text-sm text-gray-700">
                      <p className="font-semibold text-xs uppercase tracking-wider text-gray-400 mb-1">Notes</p>
                      <p className="whitespace-pre-wrap">{notes}</p>
                    </div>
                  )}
                  {terms && (
                    <div className="mt-4 text-xs text-gray-500 border-t border-gray-200 pt-4 whitespace-pre-wrap">{terms}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
