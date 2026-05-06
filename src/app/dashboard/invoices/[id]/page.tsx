'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Printer, Send, Mail, Copy, ExternalLink,
  DollarSign, Trash2, Plus, X, AlertCircle
} from 'lucide-react'
import Breadcrumbs from '../../../../components/Breadcrumbs'
import { supabase } from '../../../../lib/supabase-client'

type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'

interface LineItem {
  id: string
  description: string
  qty: number
  quantity: number
  unit: string
  rate: number
  unit_price: number
  amount: number
  total: number
  position: number
  sort_order: number
}

interface Payment {
  id: string
  amount: number
  payment_method: string
  reference_number: string | null
  paid_at: string
  notes: string | null
}

interface Invoice {
  id: string
  invoice_number: string
  status: InvoiceStatus
  invoice_type: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total: number
  amount_paid: number
  balance_due: number
  issue_date: string
  due_date: string | null
  sent_at: string | null
  paid_at: string | null
  notes: string | null
  terms: string | null
  public_token: string
  client_id: string | null
  job_id: string | null
  milestone_label: string | null
  is_recurring: boolean
  recurrence_interval: string | null
  next_recurrence_date: string | null
  clients?: { first_name: string; last_name: string; email: string | null; phone: string | null; address_line1: string | null; address_line2: string | null } | null
  jobs?: { title: string } | null
}

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; text: string; border: string; label: string }> = {
  draft:           { bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-gray-300',    label: 'Draft' },
  sent:            { bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-300',    label: 'Sent' },
  viewed:          { bg: 'bg-indigo-50',   text: 'text-indigo-700',  border: 'border-indigo-300',  label: 'Viewed' },
  partially_paid:  { bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-300',  label: 'Partially Paid' },
  paid:            { bg: 'bg-green-50',    text: 'text-green-700',   border: 'border-green-300',   label: 'Paid' },
  overdue:         { bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-300',     label: 'Overdue' },
  cancelled:       { bg: 'bg-gray-100',    text: 'text-gray-500',    border: 'border-gray-200',    label: 'Cancelled' },
}

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [copyMsg, setCopyMsg] = useState<string | null>(null)

  const fetchInvoice = useCallback(async () => {
    setLoading(true)
    const [{ data: inv }, { data: items }, { data: pays }] = await Promise.all([
      supabase
        .from('invoices')
        .select(`
          *,
          clients (first_name, last_name, email, phone, address_line1, address_line2),
          jobs (title)
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', id)
        .order('position'),
      supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', id)
        .order('paid_at', { ascending: false }),
    ])
    if (inv) setInvoice(inv as unknown as Invoice)
    if (items) setLineItems(items)
    if (pays) setPayments(pays)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchInvoice() }, [fetchInvoice])

  const updateStatus = async (status: InvoiceStatus) => {
    if (!invoice) return
    const updates: Partial<Invoice> = { status }
    if (status === 'sent' && !invoice.sent_at) {
      (updates as { sent_at?: string }).sent_at = new Date().toISOString()
    }
    const { error } = await supabase.from('invoices').update(updates).eq('id', invoice.id)
    if (!error) setInvoice(prev => prev ? { ...prev, ...updates } : null)
  }

  const deleteInvoice = async () => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (!error) router.push('/dashboard/invoices')
  }

  const deletePayment = async (paymentId: string) => {
    if (!confirm('Delete this payment?')) return
    const { error } = await supabase.from('payments').delete().eq('id', paymentId)
    if (!error) {
      // Refetch since trigger updates invoice
      fetchInvoice()
    }
  }

  const copyPortalLink = () => {
    if (!invoice) return
    const url = `${window.location.origin}/invoice/${invoice.public_token}`
    navigator.clipboard.writeText(url)
    setCopyMsg('Customer portal link copied!')
    setTimeout(() => setCopyMsg(null), 2000)
  }

  const emailInvoice = () => {
    if (!invoice || !invoice.clients?.email) {
      alert('Customer has no email on file')
      return
    }
    const portalUrl = `${window.location.origin}/invoice/${invoice.public_token}`
    const subject = `Invoice ${invoice.invoice_number} from us`
    const body = `Hi ${invoice.clients.first_name},\n\nYour invoice ${invoice.invoice_number} for $${Number(invoice.total).toFixed(2)} is ready.\n\nView and pay online: ${portalUrl}\n\nThanks!`
    window.location.href = `mailto:${invoice.clients.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    if (invoice.status === 'draft') updateStatus('sent')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-lg font-bold text-gray-900">Invoice not found</p>
        <Link href="/dashboard/invoices" className="text-sm text-teal-600 hover:text-teal-700 mt-2">← Back to invoices</Link>
      </div>
    )
  }

  const status = (invoice.status === 'sent' && invoice.due_date && new Date(invoice.due_date) < new Date()) ? 'overdue' : invoice.status
  const style = STATUS_STYLES[status]
  const customerName = invoice.clients ? `${invoice.clients.first_name} ${invoice.clients.last_name}` : 'No customer'
  const isPaid = invoice.balance_due <= 0 && invoice.total > 0

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="print:hidden">
        <Breadcrumbs items={[
          { label: 'Invoices', href: '/dashboard/invoices' },
          { label: invoice.invoice_number, href: `/dashboard/invoices/${invoice.id}` },
        ]} />
      </div>

      {copyMsg && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold print:hidden">
          {copyMsg}
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Toolbar */}
        <div className="mb-5 flex items-center gap-3 flex-wrap print:hidden">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Finance</p>
            <h1 className="text-xl font-bold text-gray-900">{invoice.invoice_number}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={copyPortalLink}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">
              <Copy size={12} /> Copy Link
            </button>
            <Link href={`/invoice/${invoice.public_token}`} target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">
              <ExternalLink size={12} /> Customer View
            </Link>
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">
              <Printer size={12} /> Print / PDF
            </button>
            <button onClick={emailInvoice}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold">
              <Mail size={12} /> Email
            </button>
            {!isPaid && (
              <button onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold">
                <DollarSign size={12} /> Record Payment
              </button>
            )}
          </div>
        </div>

        {/* Status banner */}
        <div className={`mb-5 rounded-2xl p-4 ${style.bg} border ${style.border} flex items-center justify-between flex-wrap gap-3 print:hidden`}>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${style.text.replace('text-', 'bg-')}`} />
            <span className={`font-bold ${style.text}`}>{style.label}</span>
            <span className="text-xs text-gray-500">
              Issued {new Date(invoice.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {invoice.due_date && ` • Due ${new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {invoice.status === 'draft' && (
              <button onClick={() => updateStatus('sent')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold">
                <Send size={11} /> Mark as Sent
              </button>
            )}
            {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
              <button onClick={() => updateStatus('cancelled')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-600 hover:bg-white">
                Cancel Invoice
              </button>
            )}
          </div>
        </div>

        {/* Invoice document */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-10 print:shadow-none print:border-0">
          <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Invoice</p>
              <h2 className="text-3xl font-bold text-gray-900">{invoice.invoice_number}</h2>
              {invoice.milestone_label && (
                <p className="text-sm text-gray-500 mt-1">{invoice.milestone_label}</p>
              )}
              {invoice.is_recurring && invoice.recurrence_interval && (
                <p className="text-sm text-gray-500 mt-1 capitalize">
                  Recurring {invoice.recurrence_interval.replace('_', ' ')}
                  {invoice.next_recurrence_date && ` • Next: ${new Date(invoice.next_recurrence_date).toLocaleDateString()}`}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Amount</p>
              <p className="text-3xl font-bold text-gray-900">${Number(invoice.total).toFixed(2)}</p>
              {invoice.balance_due > 0 ? (
                <p className="text-sm text-orange-600 font-semibold mt-1">
                  Balance Due: ${Number(invoice.balance_due).toFixed(2)}
                </p>
              ) : invoice.total > 0 ? (
                <p className="text-sm text-green-600 font-semibold mt-1">PAID IN FULL</p>
              ) : null}
            </div>
          </div>

          {/* Bill to + Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 pb-8 border-b border-gray-100">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Bill To</p>
              <p className="text-sm font-bold text-gray-900">{customerName}</p>
              {invoice.clients?.email && <p className="text-sm text-gray-600">{invoice.clients.email}</p>}
              {invoice.clients?.phone && <p className="text-sm text-gray-600">{invoice.clients.phone}</p>}
              {invoice.clients?.address_line1 && <p className="text-sm text-gray-600 mt-1">{invoice.clients.address_line1}</p>}
              {invoice.clients?.address_line2 && <p className="text-sm text-gray-600">{invoice.clients.address_line2}</p>}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Issue Date</p>
              <p className="text-sm font-semibold text-gray-800">
                {new Date(invoice.issue_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              {invoice.due_date && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 mt-3">Due Date</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </>
              )}
            </div>
            {invoice.jobs?.title && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Related Job</p>
                <p className="text-sm font-semibold text-gray-800">{invoice.jobs.title}</p>
              </div>
            )}
          </div>

          {/* Line items */}
          <table className="w-full mb-8">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Description</th>
                <th className="text-right py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-20">Qty</th>
                <th className="text-right py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-24">Rate</th>
                <th className="text-right py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map(item => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-3">
                    <p className="text-sm text-gray-800">{item.description}</p>
                  </td>
                  <td className="py-3 text-right text-sm text-gray-600">{item.qty ?? item.quantity} {item.unit}</td>
                  <td className="py-3 text-right text-sm text-gray-600">${Number(item.rate ?? item.unit_price).toFixed(2)}</td>
                  <td className="py-3 text-right text-sm font-semibold text-gray-900">${Number(item.amount ?? item.total).toFixed(2)}</td>
                </tr>
              ))}
              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-gray-400">No line items</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full md:w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-900">${Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              {invoice.tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax ({invoice.tax_rate}%)</span>
                  <span className="font-semibold text-gray-900">${Number(invoice.tax_amount).toFixed(2)}</span>
                </div>
              )}
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="font-semibold text-gray-900">-${Number(invoice.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-3 mt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">${Number(invoice.total).toFixed(2)}</span>
              </div>
              {Number(invoice.amount_paid) > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Paid</span>
                    <span className="font-semibold text-green-600">-${Number(invoice.amount_paid).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-3 mt-2">
                    <span className="text-gray-900">Balance Due</span>
                    <span className={Number(invoice.balance_due) > 0 ? 'text-orange-600' : 'text-green-600'}>
                      ${Number(invoice.balance_due).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {invoice.terms && (
            <div className="text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-5">
              <p className="font-semibold mb-1">Payment Terms</p>
              <p className="whitespace-pre-wrap">{invoice.terms}</p>
            </div>
          )}
        </div>

        {/* Payments */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 print:hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Payment History</h3>
            {!isPaid && (
              <button onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold">
                <Plus size={11} /> Record Payment
              </button>
            )}
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No payments recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                      <DollarSign size={14} className="text-green-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">${Number(p.amount).toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400">
                        {p.payment_method.toUpperCase()}
                        {p.reference_number && ` • ${p.reference_number}`}
                        {' • '}{new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {p.notes && <p className="text-[10px] text-gray-500 mt-0.5">{p.notes}</p>}
                    </div>
                  </div>
                  <button onClick={() => deletePayment(p.id)}
                    className="text-gray-300 hover:text-red-500 transition p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="mt-6 mb-8 print:hidden">
          <button onClick={deleteInvoice}
            className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5">
            <Trash2 size={11} /> Delete Invoice
          </button>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onSaved={() => { setShowPaymentModal(false); fetchInvoice() }}
        />
      )}
    </div>
  )
}

/* ── PAYMENT MODAL ──────────────────────────────────────────────────── */
function PaymentModal({ invoice, onClose, onSaved }: {
  invoice: Invoice; onClose: () => void; onSaved: () => void
}) {
  const [amount, setAmount] = useState(Number(invoice.balance_due).toFixed(2))
  const [method, setMethod] = useState<'cash' | 'check' | 'card' | 'ach' | 'stripe' | 'other'>('cash')
  const [reference, setReference] = useState('')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return }
    setSaving(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Not logged in'); setSaving(false); return }

    const { error: err } = await supabase.from('payments').insert({
      invoice_id: invoice.id,
      contractor_id: session.user.id,
      amount: amt,
      payment_method: method,
      reference_number: reference.trim() || null,
      paid_at: new Date(paidAt).toISOString(),
      notes: notes.trim() || null,
    })

    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  const METHODS = [
    { id: 'cash', label: 'Cash' },
    { id: 'check', label: 'Check' },
    { id: 'card', label: 'Credit Card' },
    { id: 'ach', label: 'ACH / Bank' },
    { id: 'other', label: 'Other' },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-green-600" />
            <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Balance Due</p>
            <p className="text-2xl font-bold text-orange-600">${Number(invoice.balance_due).toFixed(2)}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount Received *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400 font-semibold">$</span>
              <input autoFocus type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {parseFloat(amount) < Number(invoice.balance_due)
                ? `Partial payment — $${(Number(invoice.balance_due) - parseFloat(amount || '0')).toFixed(2)} will remain due`
                : parseFloat(amount) === Number(invoice.balance_due)
                ? 'Full payment'
                : parseFloat(amount) > Number(invoice.balance_due)
                ? 'Overpayment'
                : ''}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(m => (
                <button key={m.id} type="button" onClick={() => setMethod(m.id as 'cash' | 'check' | 'card' | 'ach' | 'other')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                    method === m.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {(method === 'check' || method === 'card' || method === 'ach' || method === 'other') && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                {method === 'check' ? 'Check Number' : 'Reference Number (optional)'}
              </label>
              <input value={reference} onChange={e => setReference(e.target.value)}
                placeholder={method === 'check' ? '#1234' : 'Last 4, txn ID, etc.'}
                className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date Received</label>
            <input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold">
            {saving ? 'Saving...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}
