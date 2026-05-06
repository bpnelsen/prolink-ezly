'use client'
import { useState, useEffect } from 'react'
import { Printer, CreditCard, CheckCircle2, AlertCircle, Phone, Mail } from 'lucide-react'
import { supabase } from '../../../lib/supabase-client'

interface LineItem {
  id: string
  description: string
  qty: number
  unit: string
  rate: number
  amount: number
  position: number
}

interface Payment {
  id: string
  amount: number
  payment_method: string
  paid_at: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Invoice = Record<string, any>

export default function PublicInvoicePage({ params }: { params: { token: string } }) {
  const { token } = params
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [stripeMsg, setStripeMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: inv } = await supabase
        .from('invoices')
        .select('*, clients(first_name, last_name, email, phone, address_line1, address_line2)')
        .eq('public_token', token)
        .single()

      if (inv) {
        setInvoice(inv)

        if (inv.status === 'sent' && !inv.viewed_at) {
          await supabase.from('invoices')
            .update({ status: 'viewed', viewed_at: new Date().toISOString() })
            .eq('id', inv.id)
        }

        // Fetch business info from customers table
        const { data: biz } = await supabase
          .from('customers')
          .select('business_name, logo_url, phone, street_address, city, state, zip_code')
          .eq('id', inv.contractor_id)
          .single()

        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', inv.contractor_id)
          .single()

        inv.business = { ...(biz || {}), ...(prof || {}) }

        // Fetch job + technician
        if (inv.job_id) {
          const { data: job } = await supabase
            .from('jobs')
            .select('title, scheduled_start, technicians(name)')
            .eq('id', inv.job_id)
            .single()
          if (job) inv.job = job
        }

        const [{ data: items }, { data: pays }] = await Promise.all([
          supabase.from('invoice_line_items').select('*').eq('invoice_id', inv.id).order('position'),
          supabase.from('payments').select('*').eq('invoice_id', inv.id).order('paid_at', { ascending: false }),
        ])
        if (items) setLineItems(items)
        if (pays) setPayments(pays)
      }
      setLoading(false)
    }
    load()
  }, [token])

  const handlePayOnline = async () => {
    setStripeMsg(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice?.id, amount: invoice?.balance_due }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setStripeMsg(data.message || 'Online payment is not yet available. Please contact us.')
    } catch {
      setStripeMsg('Online payment is not yet available. Please contact us.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-4xl mb-4">📄</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Invoice not found</h1>
        <p className="text-gray-500 text-sm">This link may be invalid or the invoice has been deleted.</p>
      </div>
    )
  }

  const biz = invoice.business || {}
  const client = invoice.clients || {}
  const job = invoice.job || null
  const customerName = client.first_name ? `${client.first_name} ${client.last_name}` : ''
  const isPaid = Number(invoice.balance_due) <= 0 && Number(invoice.total) > 0
  const isCancelled = invoice.status === 'cancelled'

  const techName = job?.technicians?.name || null
  const serviceDate = job?.scheduled_start
    ? new Date(job.scheduled_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : invoice.issue_date
      ? new Date(invoice.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—'
  const invoiceDate = invoice.issue_date
    ? new Date(invoice.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
  const dueDisplay = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Upon receipt'

  const bizAddress = [biz.street_address, biz.city && biz.state ? `${biz.city}, ${biz.state} ${biz.zip_code || ''}`.trim() : null]
    .filter(Boolean).join('\n')

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      {/* Action bar */}
      <div className="no-print bg-white border-b border-gray-200 py-3 px-6 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-gray-700">
          Invoice {invoice.invoice_number} · {biz.business_name || biz.full_name || 'Invoice'}
        </p>
        <div className="flex gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <Printer size={12} /> Print / Save PDF
          </button>
          {!isPaid && !isCancelled && (
            <button onClick={handlePayOnline}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold">
              <CreditCard size={12} /> Pay Online
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto my-6 print:my-0">
        {/* Status banners */}
        {isPaid && !isCancelled && (
          <div className="no-print mb-4 mx-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
            <p className="text-sm font-semibold text-green-800">Paid in Full — Thank you!</p>
          </div>
        )}
        {isCancelled && (
          <div className="no-print mb-4 mx-4 bg-gray-100 border border-gray-200 rounded-xl p-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-gray-500 shrink-0" />
            <p className="text-sm font-semibold text-gray-700">This invoice has been cancelled</p>
          </div>
        )}
        {stripeMsg && (
          <div className="no-print mb-4 mx-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">{stripeMsg}</div>
        )}

        {/* Invoice document */}
        <div className="bg-white shadow-sm print:shadow-none mx-4 print:mx-0">

          {/* ── Header: logo + biz name (left) | invoice box (right) ── */}
          <div className="flex items-start justify-between p-8 pb-4 gap-6 flex-wrap">
            {/* Left: logo + biz */}
            <div>
              {biz.logo_url && (
                <img src={biz.logo_url} alt="logo"
                  className="w-20 h-20 rounded-full object-cover mb-3 border border-gray-100" />
              )}
              <p className="text-xl font-bold text-gray-900 leading-tight">{biz.business_name || biz.full_name || 'Your Business'}</p>
            </div>

            {/* Right: invoice details box */}
            <div className="border border-gray-300 text-xs min-w-[220px]">
              <div className="flex">
                <span className="px-3 py-2 font-bold text-gray-600 border-r border-gray-300 w-28">INVOICE</span>
                <span className="px-3 py-2 text-gray-800">{invoice.invoice_number}</span>
              </div>
              <div className="flex border-t border-gray-300">
                <span className="px-3 py-2 font-bold text-gray-600 border-r border-gray-300 w-28">SERVICE DATE</span>
                <span className="px-3 py-2 text-gray-800">{serviceDate}</span>
              </div>
              <div className="flex border-t border-gray-300">
                <span className="px-3 py-2 font-bold text-gray-600 border-r border-gray-300 w-28">INVOICE DATE</span>
                <span className="px-3 py-2 text-gray-800">{invoiceDate}</span>
              </div>
              <div className="flex border-t border-gray-300">
                <span className="px-3 py-2 font-bold text-gray-600 border-r border-gray-300 w-28">DUE</span>
                <span className="px-3 py-2 text-gray-800">{dueDisplay}</span>
              </div>
              <div className="flex border-t border-gray-300 bg-gray-50">
                <span className="px-3 py-2 font-bold text-gray-600 border-r border-gray-300 w-28">AMOUNT DUE</span>
                <span className="px-3 py-2 font-bold text-blue-600">
                  {isPaid ? '$0.00' : `$${Number(invoice.balance_due).toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          {/* ── Two-column info ── */}
          <div className="flex gap-8 px-8 pb-6 flex-wrap">
            {/* Left: bill to */}
            <div className="flex-1 min-w-[180px]">
              {customerName && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Bill To</p>
                  <p className="text-sm font-semibold text-gray-800">{customerName}</p>
                  {client.address_line1 && <p className="text-sm text-gray-600">{client.address_line1}</p>}
                  {client.address_line2 && <p className="text-sm text-gray-600">{client.address_line2}</p>}
                </div>
              )}
              {(biz.phone || biz.email) && (
                <div className="space-y-0.5 mt-3">
                  {biz.phone && (
                    <p className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Phone size={10} className="text-gray-400" /> {biz.phone}
                    </p>
                  )}
                  {biz.email && (
                    <p className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Mail size={10} className="text-gray-400" /> {biz.email}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right: service address + contact + tech */}
            <div className="flex-1 min-w-[180px] space-y-3">
              {client.address_line1 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Service Address</p>
                  <p className="text-sm text-gray-800">{customerName}</p>
                  <p className="text-sm text-gray-600">{client.address_line1}</p>
                  {client.address_line2 && <p className="text-sm text-gray-600">{client.address_line2}</p>}
                </div>
              )}
              {bizAddress && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Contact Us</p>
                  {bizAddress.split('\n').map((line, i) => (
                    <p key={i} className="text-sm text-gray-600">{line}</p>
                  ))}
                  {biz.phone && (
                    <p className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                      <Phone size={10} className="text-gray-400" /> {biz.phone}
                    </p>
                  )}
                  {biz.email && (
                    <p className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Mail size={10} className="text-gray-400" /> {biz.email}
                    </p>
                  )}
                </div>
              )}
              {techName && (
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">Service completed by:</span> {techName}
                </p>
              )}
            </div>
          </div>

          {/* ── Line items table ── */}
          <div className="px-8 pb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2">Invoice</p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-600 text-white">
                  <th className="text-left px-3 py-2 font-semibold text-xs">Services</th>
                  <th className="text-right px-3 py-2 font-semibold text-xs w-14">qty</th>
                  <th className="text-right px-3 py-2 font-semibold text-xs w-24">unit price</th>
                  <th className="text-right px-3 py-2 font-semibold text-xs w-24">amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-3 text-gray-800">{item.description}</td>
                    <td className="px-3 py-3 text-right text-gray-600">{item.qty}</td>
                    <td className="px-3 py-3 text-right text-gray-600">${Number(item.rate).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-900">${Number(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold text-gray-900">${Number(invoice.subtotal).toFixed(2)}</span>
                </div>
                {Number(invoice.tax_amount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tax ({invoice.tax_rate}%)</span>
                    <span className="font-semibold text-gray-900">${Number(invoice.tax_amount).toFixed(2)}</span>
                  </div>
                )}
                {Number(invoice.discount_amount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-semibold text-gray-900">−${Number(invoice.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-gray-300 pt-2 text-base">
                  <span>Total</span>
                  <span>${Number(invoice.total).toFixed(2)}</span>
                </div>
                {Number(invoice.amount_paid) > 0 && (
                  <>
                    <div className="flex justify-between text-green-600">
                      <span>Paid</span>
                      <span>−${Number(invoice.amount_paid).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-gray-300 pt-2 text-blue-600">
                      <span>Balance Due</span>
                      <span>${Number(invoice.balance_due).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment history */}
            {payments.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Payments Received</p>
                <div className="space-y-1">
                  {payments.map(p => (
                    <div key={p.id} className="flex justify-between text-xs text-gray-600">
                      <span>{new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {p.payment_method}</span>
                      <span className="font-semibold text-green-700">${Number(p.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes & Terms */}
            {invoice.notes && (
              <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
                <p className="font-semibold text-xs uppercase tracking-wider text-gray-400 mb-1">Notes</p>
                <p className="whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div className="mt-4 text-xs text-gray-500 border-t border-gray-200 pt-4 whitespace-pre-wrap">
                {invoice.terms}
              </div>
            )}
          </div>
        </div>

        {/* Pay online CTA (non-print) */}
        {!isPaid && !isCancelled && (
          <div className="no-print mx-4 mt-4 bg-gray-800 rounded-xl p-5 text-white flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-white/60 uppercase font-bold tracking-wider">Balance Due</p>
              <p className="text-2xl font-bold">${Number(invoice.balance_due).toFixed(2)}</p>
            </div>
            <button onClick={handlePayOnline}
              className="flex items-center gap-2 px-5 py-3 bg-teal-500 hover:bg-teal-600 rounded-xl font-bold text-sm transition">
              <CreditCard size={14} /> Pay Online
            </button>
          </div>
        )}

        <p className="no-print text-center text-xs text-gray-400 mt-6 mb-8">
          Powered by <a href="https://useezly.com" className="text-teal-600 font-semibold">Prolink by EZLY</a>
        </p>
      </div>
    </div>
  )
}
