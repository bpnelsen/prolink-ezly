'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Shield, DollarSign, CreditCard, TrendingUp, AlertTriangle,
  ExternalLink, Building2, Receipt,
} from 'lucide-react'
import Breadcrumbs from '../../../../components/Breadcrumbs'
import { supabase } from '../../../../lib/supabase-client'
import { useIsAdmin } from '../../../../lib/admin'

interface PaymentRow {
  id: string
  invoice_id: string
  contractor_id: string
  amount: number
  payment_method: string | null
  stripe_application_fee_amount: number | null
  stripe_payment_intent_id: string | null
  stripe_charge_id: string | null
  paid_at: string
}

interface ContractorLite {
  id: string
  full_name: string | null
  business_name: string | null
  email: string | null
}

interface PerContractor {
  id: string
  name: string
  business: string | null
  txn_count: number
  gross: number
  platform_fees: number
}

const RANGES = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
  { id: 'ytd', label: 'YTD', days: null },
  { id: 'all', label: 'All time', days: null },
] as const

type RangeId = (typeof RANGES)[number]['id']

export default function AdminPaymentsPage() {
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  const [range, setRange] = useState<RangeId>('30d')
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [contractors, setContractors] = useState<Record<string, ContractorLite>>({})

  const fetchAll = useCallback(async () => {
    setLoading(true)

    let q = supabase
      .from('payments')
      .select('id, invoice_id, contractor_id, amount, payment_method, stripe_application_fee_amount, stripe_payment_intent_id, stripe_charge_id, paid_at')
      .order('paid_at', { ascending: false })
      .limit(2000)

    const cutoff = rangeCutoff(range)
    if (cutoff) q = q.gte('paid_at', cutoff.toISOString())

    const { data: paymentRows } = await q
    const rows = (paymentRows || []) as PaymentRow[]
    setPayments(rows)

    const contractorIds = Array.from(new Set(rows.map(r => r.contractor_id)))
    if (contractorIds.length) {
      const [{ data: profiles }, { data: biz }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').in('id', contractorIds),
        supabase.from('customers').select('id, business_name').in('id', contractorIds),
      ])
      const map: Record<string, ContractorLite> = {}
      for (const p of profiles || []) {
        map[p.id] = { id: p.id, full_name: p.full_name, email: p.email, business_name: null }
      }
      for (const b of biz || []) {
        if (map[b.id]) map[b.id].business_name = b.business_name
        else map[b.id] = { id: b.id, full_name: null, email: null, business_name: b.business_name }
      }
      setContractors(map)
    } else {
      setContractors({})
    }

    setLoading(false)
  }, [range])

  useEffect(() => {
    if (isAdmin) fetchAll()
  }, [isAdmin, fetchAll])

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <AlertTriangle size={32} className="text-red-500 mb-3" />
        <p className="text-lg font-bold text-gray-900">Access denied</p>
        <p className="text-sm text-gray-500 mt-1">Redirecting...</p>
      </div>
    )
  }

  // Stripe app fees are stored in cents (integer); payment.amount is in dollars.
  const stripePayments = payments.filter(p => !!p.stripe_payment_intent_id)
  const grossDollars = stripePayments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const feeCents = stripePayments.reduce((s, p) => s + (p.stripe_application_fee_amount || 0), 0)
  const feeDollars = feeCents / 100
  const avgDollars = stripePayments.length ? grossDollars / stripePayments.length : 0

  // Per-contractor rollup
  const perContractor: PerContractor[] = Object.values(
    stripePayments.reduce<Record<string, PerContractor>>((acc, p) => {
      const c = contractors[p.contractor_id]
      const row = acc[p.contractor_id] || {
        id: p.contractor_id,
        name: c?.full_name || c?.email || 'Unknown',
        business: c?.business_name || null,
        txn_count: 0,
        gross: 0,
        platform_fees: 0,
      }
      row.txn_count += 1
      row.gross += Number(p.amount || 0)
      row.platform_fees += (p.stripe_application_fee_amount || 0) / 100
      acc[p.contractor_id] = row
      return acc
    }, {}),
  ).sort((a, b) => b.platform_fees - a.platform_fees)

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[
        { label: 'Admin', href: '/dashboard/admin' },
        { label: 'Platform Payments', href: '/dashboard/admin/payments' },
      ]} />

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-purple-600" />
              <p className="text-xs font-bold uppercase tracking-widest text-purple-600">Platform Admin</p>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Platform Payments</h1>
            <p className="text-sm text-gray-500 mt-0.5">Stripe Connect activity and platform fee revenue across all contractors.</p>
          </div>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {RANGES.map(r => (
              <button key={r.id} onClick={() => setRange(r.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  range === r.id ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard icon={<DollarSign size={16} className="text-green-600" />}
            label="Platform fees" value={`$${feeDollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub="Application fees collected" />
          <StatCard icon={<TrendingUp size={16} className="text-teal-600" />}
            label="Gross volume" value={`$${grossDollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            sub="Processed via Stripe" />
          <StatCard icon={<CreditCard size={16} className="text-purple-600" />}
            label="Transactions" value={String(stripePayments.length)}
            sub={`Avg $${avgDollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
          <StatCard icon={<Building2 size={16} className="text-blue-600" />}
            label="Earning contractors" value={String(perContractor.length)}
            sub="With at least 1 paid invoice" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : stripePayments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <Receipt size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 mb-1">No Stripe payments yet for this range</p>
            <p className="text-xs text-gray-400">Once contractors connect Stripe and customers pay invoices online, they&apos;ll show up here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Top earning contractors */}
            <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Top contractors by fees</p>
              </div>
              <div className="divide-y divide-gray-100">
                {perContractor.slice(0, 10).map(row => (
                  <Link key={row.id} href={`/dashboard/admin/contractors/${row.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-purple-50/30 transition">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{row.business || row.name}</p>
                      <p className="text-[11px] text-gray-400">{row.txn_count} txn · ${row.gross.toLocaleString(undefined, { maximumFractionDigits: 0 })} gross</p>
                    </div>
                    <p className="text-sm font-bold text-green-600 shrink-0 ml-3">
                      ${row.platform_fees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent transactions */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Recent transactions</p>
                <p className="text-[11px] text-gray-400">{stripePayments.length} total</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Date</th>
                      <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Contractor</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Gross</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Platform fee</th>
                      <th className="px-3 py-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {stripePayments.slice(0, 50).map(p => {
                      const c = contractors[p.contractor_id]
                      const feeDollars = (p.stripe_application_fee_amount || 0) / 100
                      return (
                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                          <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                            {new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-3 py-2.5">
                            <Link href={`/dashboard/admin/contractors/${p.contractor_id}`}
                              className="text-xs font-semibold text-gray-800 hover:text-purple-600 truncate block max-w-[180px]">
                              {c?.business_name || c?.full_name || c?.email || p.contractor_id.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-bold text-gray-900">
                            ${Number(p.amount).toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-bold text-green-600">
                            ${feeDollars.toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5">
                            {p.stripe_charge_id && (
                              <a href={`https://dashboard.stripe.com/payments/${p.stripe_payment_intent_id}`}
                                target="_blank" rel="noopener noreferrer"
                                className="text-gray-400 hover:text-purple-600 transition" title="View in Stripe">
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {stripePayments.length > 50 && (
                <div className="px-5 py-2 border-t border-gray-100 text-center text-[11px] text-gray-400">
                  Showing 50 of {stripePayments.length} · narrow the date range to see more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function rangeCutoff(range: RangeId): Date | null {
  if (range === 'all') return null
  if (range === 'ytd') return new Date(new Date().getFullYear(), 0, 1)
  const def = RANGES.find(r => r.id === range)
  if (!def?.days) return null
  return new Date(Date.now() - def.days * 24 * 60 * 60 * 1000)
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
    </div>
  )
}
