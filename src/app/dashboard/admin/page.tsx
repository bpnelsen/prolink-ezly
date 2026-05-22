'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Shield, Users, Building2, Briefcase, FileText, DollarSign,
  Search, ExternalLink, AlertTriangle, TrendingUp, Globe, UserCheck,
  KanbanSquare, ArrowRight,
} from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import { apiFetch } from '../../../lib/api-fetch'
import { useIsAdmin } from '../../../lib/admin'

interface Contractor {
  id: string
  full_name: string | null
  email: string | null
  business_name: string | null
  phone: string | null
  created_at: string
  customer_count?: number
  job_count?: number
  active_job_count?: number
  invoice_count?: number
  outstanding?: number
  revenue_total?: number
  has_website?: boolean
  tech_count?: number
}

export default function AdminDashboardPage() {
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({
    totalContractors: 0,
    activeContractors: 0,
    totalCustomers: 0,
    totalJobs: 0,
    totalRevenue: 0,
    totalOutstanding: 0,
    totalInvoices: 0,
    websitesPublished: 0,
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const r = await apiFetch<{ contractors: Contractor[]; stats: typeof stats }>('/api/v1/admin/overview')
    if (r.data) {
      setContractors(r.data.contractors || [])
      if (r.data.stats) setStats(r.data.stats)
    }
    setLoading(false)
  }, [])

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

  const filtered = contractors.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.business_name?.toLowerCase().includes(q) ||
      c.phone?.includes(search)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Admin', href: '/dashboard/admin' }]} />

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-purple-600" />
              <p className="text-xs font-bold uppercase tracking-widest text-purple-600">Platform Admin</p>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage all contractors, customers, and platform-wide data.</p>
          </div>
          <div className="text-xs text-gray-400 bg-purple-50 border border-purple-200 px-3 py-2 rounded-xl">
            Logged in as <span className="font-bold text-purple-700">admin</span>
          </div>
        </div>

        {/* Platform stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard icon={<Building2 size={16} className="text-purple-600" />}
            label="Contractors" value={String(stats.totalContractors)}
            sub={`${stats.activeContractors} active`} />
          <StatCard icon={<Users size={16} className="text-blue-600" />}
            label="Total Customers" value={String(stats.totalCustomers)}
            sub="Across all contractors" />
          <StatCard icon={<Briefcase size={16} className="text-teal-600" />}
            label="Total Jobs" value={String(stats.totalJobs)}
            sub={`${stats.totalInvoices} invoices`} />
          <StatCard icon={<DollarSign size={16} className="text-green-600" />}
            label="Platform Revenue" value={`$${stats.totalRevenue.toLocaleString()}`}
            sub={`$${stats.totalOutstanding.toLocaleString()} outstanding`} />
        </div>

        {/* Sales CRM call-out */}
        <Link
          href="/crm"
          className="group block mb-6 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-white to-teal-50 px-5 py-4 shadow-sm hover:border-teal-400 hover:shadow-md transition"
        >
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center">
              <KanbanSquare size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700">Sales</p>
              <p className="text-base font-bold text-gray-900">Prolink Sales CRM</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Imported-contractor pipeline, deal stages, message templates, and outreach tracking.
              </p>
            </div>
            <span className="hidden sm:flex items-center gap-1 text-sm font-bold text-teal-700 group-hover:text-teal-800 shrink-0">
              Open CRM <ArrowRight size={14} />
            </span>
          </div>
        </Link>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <QuickLink href="/dashboard/admin/contractors/new" icon={<UserCheck size={14} />} label="Add Contractor" />
          <QuickLink href="/customers" icon={<Users size={14} />} label="View All Customers" />
          <QuickLink href="/dashboard/invoices" icon={<FileText size={14} />} label="View All Invoices" />
          <QuickLink href="/dispatch" icon={<Briefcase size={14} />} label="View All Jobs" />
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search contractors by name, email, business, or phone..."
              className="w-full bg-gray-50 pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition" />
          </div>
        </div>

        {/* Contractors table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-sm text-gray-400">
            {contractors.length === 0 ? 'No contractors on the platform yet.' : 'No contractors match your search.'}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Contractor</th>
                    <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden md:table-cell">Joined</th>
                    <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Customers</th>
                    <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden lg:table-cell">Team</th>
                    <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Active Jobs</th>
                    <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden md:table-cell">Revenue</th>
                    <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden lg:table-cell">Outstanding</th>
                    <th className="px-3 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const initials = (c.full_name || c.email || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
                    return (
                      <tr key={c.id} className="border-b border-gray-100 hover:bg-purple-50/30 transition">
                        <td className="px-5 py-3">
                          <Link href={`/dashboard/admin/contractors/${c.id}`} className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-gray-900 truncate">
                                  {c.full_name || 'Unnamed'}
                                </p>
                                {c.has_website && (
                                  <Globe size={11} className="text-teal-600 shrink-0" />
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 truncate">{c.business_name || c.email}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 hidden md:table-cell">
                          {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-3 py-3 text-center text-sm font-semibold text-gray-900">{c.customer_count}</td>
                        <td className="px-3 py-3 text-center text-sm font-semibold text-gray-900 hidden lg:table-cell">{c.tech_count}</td>
                        <td className="px-3 py-3 text-center">
                          {(c.active_job_count || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full text-[10px] font-bold">
                              <TrendingUp size={9} /> {c.active_job_count}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">{c.job_count} total</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-bold text-gray-900 hidden md:table-cell">
                          ${(c.revenue_total || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right hidden lg:table-cell">
                          {(c.outstanding || 0) > 0 ? (
                            <span className="text-sm font-bold text-orange-600">${(c.outstanding || 0).toLocaleString()}</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <Link href={`/dashboard/admin/contractors/${c.id}`}
                            className="text-gray-400 hover:text-purple-600 transition">
                            <ExternalLink size={13} />
                          </Link>
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

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 bg-white border border-gray-100 hover:border-purple-300 hover:bg-purple-50 rounded-xl px-4 py-3 transition shadow-sm">
      <div className="text-purple-600">{icon}</div>
      <span className="text-sm font-semibold text-gray-700">{label}</span>
    </Link>
  )
}
