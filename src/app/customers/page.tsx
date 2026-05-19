'use client'
import { useState, useEffect, useRef } from 'react'
import { Phone, Mail, MapPin, Search, Plus, Eye, Briefcase, FileText, MoreHorizontal, Trash2, Users, Building2, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase-client'
import Breadcrumbs from '../../components/Breadcrumbs'
import { LIFECYCLE_META, LIFECYCLE_STATUSES } from '../../lib/crm'

interface Client {
  id: string
  first_name: string
  last_name: string
  client_type: string | null
  company_name: string | null
  lifecycle_status: string | null
  address_verified: boolean | null
  phone: string | null
  email: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  created_at: string
  job_count?: number
  total_invoiced?: number
}

function RowMenu({ clientId, onDelete }: { clientId: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleDelete = async () => {
    setOpen(false)
    if (!confirm('Archive this customer? They will be hidden from your list.')) return
    await supabase.from('clients').update({ is_deleted: true }).eq('id', clientId)
    onDelete()
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
        <MoreHorizontal className="text-gray-400" size={15} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
          <button onClick={() => { setOpen(false); router.push(`/customers/${clientId}`) }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Eye size={13} /> View Details
          </button>
          <button onClick={() => { setOpen(false); router.push(`/customers/${clientId}/edit`) }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Eye size={13} /> Edit
          </button>
          <button onClick={handleDelete}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
            <Trash2 size={13} /> Archive
          </button>
        </div>
      )}
    </div>
  )
}

export default function CustomersPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchClients = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const [{ data: clientData }, { data: jobData }, { data: invoiceData }] = await Promise.all([
      supabase.from('clients').select('id, first_name, last_name, client_type, company_name, lifecycle_status, address_verified, phone, email, address_line1, city, state, created_at')
        .eq('contractor_id', session.user.id).neq('is_deleted', true).order('first_name'),
      supabase.from('jobs').select('id, client_id').eq('contractor_id', session.user.id),
      supabase.from('invoices').select('client_id, total').eq('contractor_id', session.user.id).eq('status', 'paid'),
    ])

    if (clientData) {
      const jobCounts: Record<string, number> = {}
      const invoiceTotals: Record<string, number> = {}
      jobData?.forEach(j => { jobCounts[j.client_id] = (jobCounts[j.client_id] || 0) + 1 })
      invoiceData?.forEach(i => { invoiceTotals[i.client_id] = (invoiceTotals[i.client_id] || 0) + Number(i.total) })

      setClients(clientData.map(c => ({
        ...c,
        job_count: jobCounts[c.id] || 0,
        total_invoiced: invoiceTotals[c.id] || 0,
      })))
    }
    setLoading(false)
  }

  useEffect(() => { fetchClients() }, [])

  const displayName = (c: Client) =>
    c.client_type === 'company' && c.company_name
      ? c.company_name
      : `${c.first_name} ${c.last_name}`.trim()

  const filtered = clients.filter(c => {
    const matchesSearch =
      !search ||
      displayName(c).toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.city?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || (c.lifecycle_status || 'lead') === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Customers', href: '/customers' }]} />
      <main className="max-w-6xl mx-auto p-4 md:p-8">

        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">CRM</p>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Customers</h2>
          </div>
          <Link href="/customers/new"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl shadow-sm transition whitespace-nowrap shrink-0">
            <Plus size={15} /> <span className="hidden sm:inline">New Customer</span><span className="sm:hidden">New</span>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
            placeholder="Search by name, email, phone, city…" />
        </div>

        {/* Lifecycle filter */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {['all', ...LIFECYCLE_STATUSES].map(s => {
            const meta = s === 'all' ? null : LIFECYCLE_META[s]
            const activeF = statusFilter === s
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  activeF
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>
                {s === 'all' ? 'All' : meta!.label}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Users size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">{search ? 'No customers match your search.' : 'No customers yet.'}</p>
            <p className="text-gray-400 text-sm mt-1">{search ? 'Try a different term.' : 'Add your first customer to get started.'}</p>
            {!search && (
              <Link href="/customers/new" className="inline-flex items-center gap-2 mt-4 text-teal-600 font-semibold text-sm hover:text-teal-700">
                <Plus size={14} /> Add First Customer
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => {
              const location = [c.city, c.state].filter(Boolean).join(', ') || c.address_line1
              const name = displayName(c)
              const isCompany = c.client_type === 'company'
              const status = LIFECYCLE_META[c.lifecycle_status || 'lead'] || LIFECYCLE_META.lead
              const initials = isCompany
                ? (c.company_name || '?').slice(0, 2).toUpperCase()
                : `${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 hover:border-gray-200 transition">
                  {/* Top row on mobile: avatar + name + menu */}
                  <div className="flex items-center gap-3 md:contents">
                    {/* Avatar */}
                    <Link href={`/customers/${c.id}`} className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center shrink-0 text-teal-700 font-bold text-sm">
                      {isCompany ? <Building2 size={16} /> : initials}
                    </Link>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/customers/${c.id}`} className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>{status.label}</span>
                        {c.address_verified && <ShieldCheck size={12} className="text-green-600 shrink-0" />}
                      </Link>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {c.phone && <span className="flex items-center gap-1 text-xs text-gray-500 min-w-0"><Phone size={10} className="shrink-0" /> <span className="truncate">{c.phone}</span></span>}
                        {c.email && <span className="flex items-center gap-1 text-xs text-gray-500 min-w-0"><Mail size={10} className="shrink-0" /> <span className="truncate">{c.email}</span></span>}
                        {location && <span className="flex items-center gap-1 text-xs text-gray-500 min-w-0"><MapPin size={10} className="shrink-0" /> <span className="truncate">{location}</span></span>}
                      </div>
                    </div>

                    {/* Mobile-only menu */}
                    <div className="md:hidden">
                      <RowMenu clientId={c.id} onDelete={fetchClients} />
                    </div>
                  </div>

                  {/* Stats (desktop only) */}
                  <div className="hidden md:flex items-center gap-4 shrink-0">
                    {(c.job_count ?? 0) > 0 && (
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-800">{c.job_count}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Job{c.job_count !== 1 ? 's' : ''}</p>
                      </div>
                    )}
                    {(c.total_invoiced ?? 0) > 0 && (
                      <div className="text-center">
                        <p className="text-sm font-bold text-teal-600">${Number(c.total_invoiced).toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Paid</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 md:shrink-0 flex-wrap">
                    <Link href={`/customers/${c.id}`}
                      className="flex items-center gap-1 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-xl transition">
                      <Eye size={12} /> View
                    </Link>
                    <Link href={`/new-job?client_id=${c.id}`}
                      className="flex items-center gap-1 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-xl transition">
                      <Briefcase size={12} /> Job
                    </Link>
                    <Link href={`/dashboard/invoices/new?client_id=${c.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition">
                      <FileText size={12} /> Invoice
                    </Link>
                    <div className="hidden md:block">
                      <RowMenu clientId={c.id} onDelete={fetchClients} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
