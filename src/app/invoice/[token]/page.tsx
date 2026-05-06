'use client'
import { useState, useEffect } from 'react'
import { Printer, CreditCard, CheckCircle2, AlertCircle, Mail, Phone } from 'lucide-react'
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
        .select(`
          *,
          clients (first_name, last_name, email, phone, address_line1, address_line2)
        `)
        .eq('public_token', token)
        .single()

      if (inv) {
        setInvoice(inv)

        // Mark as viewed if currently sent
        if (inv.status === 'sent' && !inv.viewed_at) {
          await supabase.from('invoices')
            .update({ status: 'viewed', viewed_at: new Date().toISOString() })
            .eq('id', inv.id)
        }

        // Get contractor business info
        const { data: profile } = await supabase
          .from('profiles')
          .select('business_name, full_name, phone, email')
          .eq('id', inv.contractor_id)
          .single()

        if (profile) inv.business = profile

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
      if (data.url) {
        window.location.href = data.url
      } else {
        setStripeMsg(data.message || 'Online payment is not yet available. Please contact us to arrange payment.')
      }
    } catch {
      setStripeMsg('Online payment is not yet available. Please contact us to arrange payment.')
    }
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-4xl mb-4">📄</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invoice not found</h1>
        <p className="text-gray-500">This link may be invalid or the invoice has been deleted.</p>
      </div>
    )
  }

  const customerName = invoice.clients ? `${invoice.clients.first_name} ${invoice.clients.last_name}` : ''
  const isPaid = Number(invoice.balance_due) <= 0 && Number(invoice.total) > 0
  const isCancelled = invoice.status === 'cancelled'
  const business = invoice.business || {}

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Top status bar (non-print) */}
      <div className="no-print bg-[#0f1d35] text-white py-3 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-white/60">Invoice from {business.business_name || business.full_name || 'your contractor'}</p>
            <p className="font-bold">{invoice.invoice_number}</p>
          </div>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition">
            <Printer size={11} /> Print / PDF
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {/* Status banner */}
        {isPaid && !isCancelled && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-5 flex items-center gap-3 no-print">
            <CheckCircle2 size={20} className="text-green-600 shrink-0" />
            <div>
              <p className="font-bold text-green-800">Paid in Full</p>
              <p className="text-xs text-green-600">Thank you for your prompt payment.</p>
            </div>
          </div>
        )}
        {isCancelled && (
          <div className="bg-gray-100 border border-gray-200 rounded-2xl p-4 mb-5 flex items-center gap-3 no-print">
            <AlertCircle size={20} className="text-gray-500 shrink-0" />
            <div>
              <p className="font-bold text-gray-700">This invoice has been cancelled</p>
              <p className="text-xs text-gray-500">Please contact us if you have questions.</p>
            </div>
          </div>
        )}

        {/* Invoice Document */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 print:shadow-none print:border-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">From</p>
              <p className="text-lg font-bold text-gray-900">{business.business_name || business.full_name}</p>
              {business.email && <p className="text-sm text-gray-600">{business.email}</p>}
              {business.phone && <p className="text-sm text-gray-600">{business.phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Invoice</p>
              <p className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</p>
              <p className="text-sm text-gray-500 mt-1">
                Issued {new Date(invoice.issue_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              {invoice.due_date && (
                <p className="text-sm text-gray-500">
                  Due {new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {/* Bill to */}
          <div className="mb-8 pb-8 border-b border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Bill To</p>
            <p className="text-base font-bold text-gray-900">{customerName}</p>
            {invoice.clients?.email && <p className="text-sm text-gray-600">{invoice.clients.email}</p>}
            {invoice.clients?.address_line1 && <p className="text-sm text-gray-600 mt-1">{invoice.clients.address_line1}</p>}
            {invoice.clients?.address_line2 && <p className="text-sm text-gray-600">{invoice.clients.address_line2}</p>}
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
                  <td className="py-3 text-sm text-gray-800">{item.description}</td>
                  <td className="py-3 text-right text-sm text-gray-600">{item.qty} {item.unit}</td>
                  <td className="py-3 text-right text-sm text-gray-600">${Number(item.rate).toFixed(2)}</td>
                  <td className="py-3 text-right text-sm font-semibold text-gray-900">${Number(item.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full md:w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-900">${Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              {Number(invoice.tax_amount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax ({invoice.tax_rate}%)</span>
                  <span className="font-semibold text-gray-900">${Number(invoice.tax_amount).toFixed(2)}</span>
                </div>
              )}
              {Number(invoice.discount_amount) > 0 && (
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

          {/* Pay button */}
          {!isPaid && !isCancelled && (
            <div className="bg-[#0f1d35] rounded-2xl p-5 text-white mb-6 no-print">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-white/60 uppercase font-bold tracking-wider">Amount Due</p>
                  <p className="text-2xl font-bold">${Number(invoice.balance_due).toFixed(2)}</p>
                </div>
                <button onClick={handlePayOnline}
                  className="flex items-center gap-2 px-5 py-3 bg-teal-500 hover:bg-teal-600 rounded-xl font-bold text-sm transition">
                  <CreditCard size={14} /> Pay Online
                </button>
              </div>
              {stripeMsg && (
                <div className="mt-3 p-3 bg-white/10 rounded-xl text-xs text-white/80">{stripeMsg}</div>
              )}
            </div>
          )}

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Payments Received</p>
              <div className="space-y-1">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' • '}{p.payment_method.toUpperCase()}
                    </span>
                    <span className="font-semibold text-green-600">${Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes & Terms */}
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

        {/* Contact card */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 no-print">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Questions about this invoice?</p>
          <div className="flex flex-col sm:flex-row gap-3">
            {business.email && (
              <a href={`mailto:${business.email}?subject=Question about ${invoice.invoice_number}`}
                className="flex-1 flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-semibold text-gray-700 transition">
                <Mail size={14} className="text-teal-600" /> Email Us
              </a>
            )}
            {business.phone && (
              <a href={`tel:${business.phone}`}
                className="flex-1 flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-semibold text-gray-700 transition">
                <Phone size={14} className="text-teal-600" /> Call {business.phone}
              </a>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6 no-print">
          Powered by <a href="https://useezly.com" className="text-teal-600 hover:text-teal-700 font-semibold">Prolink by EZLY</a>
        </p>
      </div>
    </div>
  )
}
