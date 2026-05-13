'use client'
import { useState, useEffect } from 'react'
import { FileText, Plus, MapPin, User, Calendar, DollarSign, Search, Eye, Edit2 } from 'lucide-react'
import Link from 'next/link'
import Breadcrumbs from '../../../components/Breadcrumbs'
import { supabase } from '../../../lib/supabase-client'

type JobStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'

interface Job {
  id: string
  title: string
  status: JobStatus
  trade: string | null
  site_address: string | null
  estimated_value: number | null
  scheduled_start: string | null
  created_at: string
  clients: { first_name: string; last_name: string } | null
  technicians: { name: string } | null
}

const STATUS = {
  all:         { label: 'All Jobs',    bg: '',                  text: '',               dot: '' },
  pending:     { label: 'Pending',     bg: 'bg-yellow-50',      text: 'text-yellow-700', dot: 'bg-yellow-400' },
  assigned:    { label: 'Assigned',    bg: 'bg-blue-50',        text: 'text-blue-700',   dot: 'bg-blue-500' },
  in_progress: { label: 'In Progress', bg: 'bg-orange-50',      text: 'text-orange-700', dot: 'bg-orange-500' },
  completed:   { label: 'Completed',   bg: 'bg-green-50',       text: 'text-green-700',  dot: 'bg-green-500' },
  cancelled:   { label: 'Cancelled',   bg: 'bg-gray-50',        text: 'text-gray-500',   dot: 'bg-gray-400' },
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | JobStatus>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data } = await supabase
        .from('jobs')
        .select('id, title, status, trade, site_address, estimated_value, scheduled_start, created_at, clients(first_name, last_name), technicians(name)')
        .eq('contractor_id', session.user.id)
        .order('created_at', { ascending: false })

      setJobs((data as unknown as Job[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = jobs.filter(j => {
    const matchesStatus = filter === 'all' || j.status === filter
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      j.title.toLowerCase().includes(q) ||
      (j.clients?.first_name + ' ' + j.clients?.last_name).toLowerCase().includes(q) ||
      (j.site_address || '').toLowerCase().includes(q) ||
      (j.trade || '').toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  const counts = Object.keys(STATUS).reduce((acc, key) => {
    acc[key] = key === 'all' ? jobs.length : jobs.filter(j => j.status === key).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Jobs', href: '/dashboard/jobs' }]} />
      <div className="max-w-6xl mx-auto p-4 md:p-8">

        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Operations</p>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Jobs</h2>
          </div>
          <Link href="/new-job"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl shadow-sm transition whitespace-nowrap shrink-0">
            <Plus size={15} /> <span className="hidden sm:inline">New Job</span><span className="sm:hidden">New</span>
          </Link>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap mb-4">
          {(Object.entries(STATUS) as [string, typeof STATUS['all']][]).map(([key, val]) => (
            <button key={key} onClick={() => setFilter(key as typeof filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                filter === key
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
              {key !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${val.dot}`} />}
              {val.label}
              <span className={`ml-0.5 ${filter === key ? 'text-gray-300' : 'text-gray-400'}`}>
                {counts[key] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
            placeholder="Search by job name, customer, address…" />
        </div>

        {/* Jobs list */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading jobs…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {search || filter !== 'all' ? 'No jobs match your filters.' : 'No jobs yet. Create your first job to get started.'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(job => {
              const s = STATUS[job.status] || STATUS.pending
              const customer = job.clients ? `${job.clients.first_name} ${job.clients.last_name}` : '—'
              const date = job.scheduled_start
                ? new Date(job.scheduled_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : job.created_at
                  ? new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—'

              return (
                <div key={job.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 hover:border-gray-200 transition">
                  <div className="flex items-start gap-3 md:contents">
                    {/* Status dot */}
                    <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${s.dot}`} />

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-gray-900 text-sm truncate">{job.title}</p>
                        <span className={`md:hidden inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${s.bg} ${s.text}`}>
                          {s.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-500 min-w-0">
                          <User size={11} className="shrink-0" /> <span className="truncate">{customer}</span>
                        </span>
                        {job.technicians?.name && (
                          <span className="text-xs text-gray-500 truncate">{job.technicians.name}</span>
                        )}
                        {job.site_address && (
                          <span className="flex items-center gap-1 text-xs text-gray-500 min-w-0">
                            <MapPin size={11} className="shrink-0" /> <span className="truncate">{job.site_address}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar size={11} className="shrink-0" /> {date}
                        </span>
                        {job.estimated_value != null && (
                          <span className="sm:hidden flex items-center gap-1 text-xs font-semibold text-gray-700">
                            <DollarSign size={11} className="text-gray-400" />
                            {Number(job.estimated_value).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Value (desktop) */}
                  {job.estimated_value != null && (
                    <div className="hidden sm:flex items-center gap-1 text-sm font-semibold text-gray-700 shrink-0">
                      <DollarSign size={13} className="text-gray-400" />
                      {Number(job.estimated_value).toLocaleString()}
                    </div>
                  )}

                  {/* Status badge (desktop) */}
                  <span className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${s.bg} ${s.text}`}>
                    {s.label}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 md:shrink-0 flex-wrap">
                    <Link href={`/dashboard/jobs/${job.id}`}
                      className="flex items-center gap-1 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-xl transition">
                      <Eye size={13} /> View
                    </Link>
                    <Link href={`/dashboard/jobs/${job.id}?edit=1`}
                      className="flex items-center gap-1 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-xl transition">
                      <Edit2 size={13} /> Edit
                    </Link>
                    <Link href={`/dashboard/invoices/new?job_id=${job.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition">
                      <FileText size={13} /> Invoice
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
