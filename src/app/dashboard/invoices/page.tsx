'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  FileText, Plus, Search, Filter, MoreVertical, Eye,
  Trash2, Send, DollarSign, AlertCircle, CheckCircle2,
  TrendingUp, FileMinus, Copy
} from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import { supabase } from '../../../lib/supabase-client'

type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'

interface Invoice {
  id: string
  invoice_number: string
  status: InvoiceStatus
  invoice_type: string
  total: number
  amount_paid: number
  balance_due: number
  issue_date: string
  due_date: string | null
  public_token: string
  client_id: string | null
  job_id: string | null
  clients?: { first_name: string; last_name: string; email: string | null } | null
}

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; text: string; border: string; label: string; icon: typeof FileText }> = {
  draft:           { bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-gray-200',    label: 'Draft',          icon: FileMinus },
  sent:            { bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-200',    label: 'Sent',           icon: Send },
  viewed:          { bg: 'bg-indigo-50',   text: 'text-indigo-700',  border: 'border-indigo-200',  label: 'Viewed',         icon: Eye },
  partially_paid:  { bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-200',  label: 'Partial',        icon: TrendingUp },
  paid:            { bg: 'bg-green-50',    text: 'text-green-700',   border: 'border-green-200',   label: 'Paid',           icon: CheckCircle2 },
  overdue:         { bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200',     label: 'Overdue',        icon: AlertCircle },
  cancelled:       { bg: 'bg-gray-100',    text: 'text-gray-500',    border: 'border-gray-200',    label: 'Cancelled',      icon: Trash2 },
}

function isOverdue(inv: Invoice): boolean {
  if (!inv.due_date) return false
  if (inv.status === 'paid' || inv.status === 'cancelled') return false
  return new Date(inv.due_date) < new Date()
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus | 'overdue'>('all')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [copyMsg, setCopyMsg] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const { data } = await supabase
      .from('invoices')
      .select(`
        id, invoice_number, status, invoice_type, total, amount_paid, balance_due,
        issue_date, due_date, public_token, client_id, job_id,
        clients (first_name, last_name, email)
      `)
      .eq('contractor_id', session.user.id)
      .order('created_at', { ascending: false })

    if (data) setInvoices(data as unknown as Invoice[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const deleteInvoice = async (id: string) => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (!error) setInvoices(prev => prev.filter(i => i.id !== id))
    setOpenMenuId(null)
  }

  const copyPortalLink = (token: string) => {
    const url = `${window.location.origin}/invoice/${token}`
    navigator.clipboard.writeText(url)
    setCopyMsg('Customer portal link copied!')
    setTimeout(() => setCopyMsg(null), 2000)
    setOpenMenuId(null)
  }

  // Aggregate stats
  const totalOutstanding = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'draft')
    .reduce((sum, i) => sum + Number(i.balance_due || 0), 0)
  const monthStart = new Date()
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const paidThisMonth = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.amount_paid || 0), 0)
  const overdue = invoices.filter(isOverdue)
  const totalOverdue = overdue.reduce((sum, i) => sum + Number(i.balance_due || 0), 0)
  const drafts = invoices.filter(i => i.status === 'draft').length

  // Filtered
  const filtered = invoices.filter(inv => {
    if (statusFilter === 'overdue') {
      if (!isOverdue(inv)) return false
    } else if (statusFilter !== 'all' && inv.status !== statusFilter) return false

    if (search) {
      const q = search.toLowerCase()
      const customer = inv.clients ? `${inv.clients.first_name} ${inv.clients.last_name}` : ''
      if (!inv.invoice_number.toLowerCase().includes(q) &&
          !customer.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50" onClick={() => setOpenMenuId(null)}>
      <Breadcrumbs items={[{ label: 'Invoices', href: '/dashboard/invoices' }]} />

      {copyMsg && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold">
          {copyMsg}
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Finance</p>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-500 mt-0.5">Bill customers, track payments, and manage revenue.</p>
          </div>
          <Link href="/dashboard/invoices/new"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition shadow-sm whitespace-nowrap">
            <Plus size={14} /> <span className="hidden sm:inline">New Invoice</span><span className="sm:hidden">New</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            icon={<DollarSign size={18} className="text-teal-600" />}
            label="Outstanding"
            value={`$${totalOutstanding.toLocaleString()}`}
            sub="Unpaid balance"
            color="text-gray-900"
          />
          <StatCard
            icon={<CheckCircle2 size={18} className="text-green-600" />}
            label="Paid This Month"
            value={`$${paidThisMonth.toLocaleString()}`}
            sub="Total received"
            color="text-green-700"
          />
          <StatCard
            icon={<AlertCircle size={18} className="text-red-600" />}
            label="Overdue"
            value={`$${totalOverdue.toLocaleString()}`}
            sub={`${overdue.length} invoice${overdue.length === 1 ? '' : 's'}`}
            color="text-red-700"
          />
          <StatCard
            icon={<FileMinus size={18} className="text-gray-500" />}
            label="Drafts"
            value={String(drafts)}
            sub="Not yet sent"
            color="text-gray-900"
          />
        </div>

        {/* Search + filter */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by invoice # or customer..."
              className="w-full bg-gray-50 pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | InvoiceStatus | 'overdue')}
              className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-sm text-gray-400">
            No invoices match your filters.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Mobile: card stack */}
            <ul className="md:hidden divide-y divide-gray-100">
              {filtered.map(inv => {
                const overdueFlag = isOverdue(inv)
                const status = overdueFlag ? 'overdue' : inv.status
                const style = STATUS_STYLES[status]
                const Icon = style.icon
                const customerName = inv.clients ? `${inv.clients.first_name} ${inv.clients.last_name}` : 'No customer'
                return (
                  <li key={inv.id} className="relative">
                    <Link href={`/dashboard/invoices/${inv.id}`} className="block p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900">{inv.invoice_number}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{customerName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900">${Number(inv.total || 0).toLocaleString()}</p>
                          {inv.balance_due > 0 ? (
                            <p className={`text-[10px] font-semibold ${overdueFlag ? 'text-red-600' : 'text-gray-500'}`}>
                              ${Number(inv.balance_due).toLocaleString()} due
                            </p>
                          ) : (
                            <p className="text-[10px] text-green-600 font-semibold">PAID</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${style.bg} ${style.text} ${style.border} border rounded-full text-[10px] font-bold`}>
                          <Icon size={10} /> {style.label}
                        </span>
                        {inv.due_date && (
                          <span className={`text-[10px] ${overdueFlag ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                            Due {new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </Link>
                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === inv.id ? null : inv.id) }}
                      className="absolute top-2 right-2 p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition"
                      aria-label="Invoice actions">
                      <MoreVertical size={14} />
                    </button>
                    {openMenuId === inv.id && (
                      <div onClick={e => e.stopPropagation()}
                        className="absolute right-3 top-10 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[180px]">
                        <Link href={`/dashboard/invoices/${inv.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                          <Eye size={12} /> View / Edit
                        </Link>
                        <button onClick={() => copyPortalLink(inv.public_token)}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                          <Copy size={12} /> Copy Portal Link
                        </button>
                        <Link href={`/invoice/${inv.public_token}`} target="_blank"
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                          <Eye size={12} /> View as Customer
                        </Link>
                        <button onClick={() => deleteInvoice(inv.id)}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 border-t border-gray-100">
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Invoice</th>
                    <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Customer</th>
                    <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden md:table-cell">Issue Date</th>
                    <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden md:table-cell">Due Date</th>
                    <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Total</th>
                    <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden lg:table-cell">Balance</th>
                    <th className="px-3 py-3 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => {
                    const overdueFlag = isOverdue(inv)
                    const status = overdueFlag ? 'overdue' : inv.status
                    const style = STATUS_STYLES[status]
                    const Icon = style.icon
                    const customerName = inv.clients ? `${inv.clients.first_name} ${inv.clients.last_name}` : 'No customer'
                    return (
                      <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                        <td className="px-5 py-3">
                          <Link href={`/dashboard/invoices/${inv.id}`} className="block">
                            <p className="text-sm font-bold text-gray-900">{inv.invoice_number}</p>
                            {inv.invoice_type !== 'one_time' && (
                              <p className="text-[10px] text-gray-400 capitalize">{inv.invoice_type.replace('_', ' ')}</p>
                            )}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-sm text-gray-800">{customerName}</p>
                          {inv.clients?.email && <p className="text-[10px] text-gray-400">{inv.clients.email}</p>}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${style.bg} ${style.text} ${style.border} border rounded-full text-[10px] font-bold`}>
                            <Icon size={10} /> {style.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 hidden md:table-cell">
                          {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm hidden md:table-cell">
                          {inv.due_date ? (
                            <span className={overdueFlag ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                              {new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <p className="text-sm font-bold text-gray-900">${Number(inv.total || 0).toLocaleString()}</p>
                        </td>
                        <td className="px-3 py-3 text-right hidden lg:table-cell">
                          {inv.balance_due > 0 ? (
                            <p className={`text-sm font-bold ${overdueFlag ? 'text-red-600' : 'text-gray-700'}`}>
                              ${Number(inv.balance_due).toLocaleString()}
                            </p>
                          ) : (
                            <span className="text-xs text-green-600 font-semibold">PAID</span>
                          )}
                        </td>
                        <td className="px-3 py-3 relative">
                          <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === inv.id ? null : inv.id) }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                            <MoreVertical size={14} />
                          </button>
                          {openMenuId === inv.id && (
                            <div onClick={e => e.stopPropagation()}
                              className="absolute right-3 top-12 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[180px]">
                              <Link href={`/dashboard/invoices/${inv.id}`}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                                <Eye size={12} /> View / Edit
                              </Link>
                              <button onClick={() => copyPortalLink(inv.public_token)}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                                <Copy size={12} /> Copy Portal Link
                              </button>
                              <Link href={`/invoice/${inv.public_token}`} target="_blank"
                                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                                <Eye size={12} /> View as Customer
                              </Link>
                              <button onClick={() => deleteInvoice(inv.id)}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 border-t border-gray-100">
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
      <div className="w-12 h-12 mx-auto bg-teal-50 rounded-xl flex items-center justify-center mb-3">
        <FileText size={20} className="text-teal-600" />
      </div>
      <p className="text-base font-bold text-gray-900 mb-1">No invoices yet</p>
      <p className="text-sm text-gray-500 mb-4">Create your first invoice to start billing customers.</p>
      <Link href="/dashboard/invoices/new"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition">
        <Plus size={14} /> Create Invoice
      </Link>
    </div>
  )
}

