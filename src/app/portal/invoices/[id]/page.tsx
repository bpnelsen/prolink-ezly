'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { supabase } from '../../../../lib/supabase-client'
import { apiFetch } from '../../../../lib/api-fetch'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export default function PortalInvoiceDetail({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [d, setD] = useState<Row | null>(null)
  const [payMsg, setPayMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace(`/portal/login?next=/portal/invoices/${params.id}`); return }
    const r = await apiFetch<Row>(`/api/v1/portal/invoices/${params.id}`)
    if (r.data) setD(r.data)
    setLoading(false)
  }, [params.id, router])

  useEffect(() => { load() }, [load])

  const pay = async () => {
    setPayMsg(null)
    const r = await apiFetch<Row>(`/api/v1/portal/invoices/${params.id}/pay`, { method: 'POST' })
    if (r.data?.url) window.location.href = r.data.url
    else setPayMsg(r.data?.message || 'Online payment is not available yet. Please contact your contractor.')
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="w-8 h-8 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin" /></div>
  }
  if (!d?.invoice) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-xl font-bold text-gray-900 mb-2">Invoice not found</p>
        <Link href="/portal" className="text-teal-600 text-sm font-semibold">← Back to portal</Link>
      </div>
    )
  }

  const inv = d.invoice
  const items: Row[] = d.line_items || []
  const payments: Row[] = d.payments || []
  const biz = d.business || {}
  const paid = Number(inv.balance_due) <= 0 && Number(inv.total) > 0

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: 'Arial, sans-serif' }}>
      <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3">
        <Link href="/portal" className="text-gray-500 hover:text-gray-800"><ArrowLeft size={16} /></Link>
        <p className="text-sm font-bold text-gray-900">Invoice {inv.invoice_number}</p>
      </header>

      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-start mb-5">
            <div>
              <p className="text-lg font-bold text-gray-900">{biz.business_name || 'Your Contractor'}</p>
              {biz.phone && <p className="text-xs text-gray-500">{biz.phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-gray-400">Amount Due</p>
              <p className={`text-xl font-bold ${paid ? 'text-green-600' : 'text-blue-600'}`}>
                {paid ? '$0.00' : `$${Number(inv.balance_due).toFixed(2)}`}
              </p>
            </div>
          </div>

          <table className="w-full text-sm border-collapse mb-4">
            <thead><tr className="bg-gray-600 text-white text-xs">
              <th className="text-left px-3 py-2">Description</th>
              <th className="text-right px-3 py-2 w-14">Qty</th>
              <th className="text-right px-3 py-2 w-24">Rate</th>
              <th className="text-right px-3 py-2 w-24">Amount</th>
            </tr></thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.id} className={idx % 2 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-3 py-2 text-gray-800">{it.description}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{it.qty}</td>
                  <td className="px-3 py-2 text-right text-gray-600">${Number(it.rate).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-semibold">${Number(it.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-56 text-sm space-y-1">
              <Rowline label="Subtotal" val={inv.subtotal} />
              {Number(inv.tax_amount) > 0 && <Rowline label={`Tax (${inv.tax_rate}%)`} val={inv.tax_amount} />}
              {Number(inv.discount_amount) > 0 && <Rowline label="Discount" val={-inv.discount_amount} />}
              <div className="flex justify-between font-bold border-t border-gray-300 pt-1.5"><span>Total</span><span>${Number(inv.total).toFixed(2)}</span></div>
              {Number(inv.amount_paid) > 0 && <Rowline label="Paid" val={-inv.amount_paid} />}
              <div className="flex justify-between font-bold text-blue-600"><span>Balance Due</span><span>${Number(inv.balance_due).toFixed(2)}</span></div>
            </div>
          </div>

          {payments.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-200">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">Payments</p>
              {payments.map(p => (
                <div key={p.id} className="flex justify-between text-xs text-gray-600">
                  <span>{new Date(p.paid_at).toLocaleDateString()} · {p.payment_method}</span>
                  <span className="font-semibold text-green-700">${Number(p.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {!paid && (
          <div className="mt-4">
            <button onClick={pay} className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm">
              <CreditCard size={15} /> Pay ${Number(inv.balance_due).toFixed(2)} online
            </button>
            {payMsg && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">{payMsg}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

function Rowline({ label, val }: { label: string; val: number | string }) {
  const n = Number(val)
  return (
    <div className="flex justify-between text-gray-500">
      <span>{label}</span>
      <span className="text-gray-900 font-semibold">{n < 0 ? '−' : ''}${Math.abs(n).toFixed(2)}</span>
    </div>
  )
}
