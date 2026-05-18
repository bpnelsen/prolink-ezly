'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Phone, Mail, MapPin, FileText, ArrowLeft, Pencil, Trash2, User, Plus, Briefcase, DollarSign, Calendar, Eye, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase-client'
import { apiFetch } from '../../../lib/api-fetch'
import Breadcrumbs from '../../../components/Breadcrumbs'

type Tab = 'overview' | 'jobs' | 'invoices'

interface Client {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  notes: string | null
  created_at: string
}

interface Job {
  id: string
  title: string
  status: string
  trade: string | null
  estimated_value: number | null
  scheduled_start: string | null
  created_at: string
}

interface Invoice {
  id: string
  invoice_number: string
  status: string
  total: number
  balance_due: number
  issue_date: string
  public_token: string
}

const JOB_STATUS: Record<string, { dot: string; label: string }> = {
  pending:     { dot: 'bg-yellow-400', label: 'Pending' },
  assigned:    { dot: 'bg-blue-500',   label: 'Assigned' },
  in_progress: { dot: 'bg-orange-500', label: 'In Progress' },
  completed:   { dot: 'bg-green-500',  label: 'Completed' },
  cancelled:   { dot: 'bg-gray-400',   label: 'Cancelled' },
}

const INV_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  draft:          { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Draft' },
  sent:           { bg: 'bg-blue-50',    text: 'text-blue-700',   label: 'Sent' },
  viewed:         { bg: 'bg-indigo-50',  text: 'text-indigo-700', label: 'Viewed' },
  partially_paid: { bg: 'bg-orange-50',  text: 'text-orange-700', label: 'Partial' },
  paid:           { bg: 'bg-green-50',   text: 'text-green-700',  label: 'Paid' },
  overdue:        { bg: 'bg-red-50',     text: 'text-red-700',    label: 'Overdue' },
  cancelled:      { bg: 'bg-gray-100',   text: 'text-gray-500',   label: 'Cancelled' },
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)

  const invitePortal = async () => {
    setInviting(true)
    setInviteMsg(null)
    const r = await apiFetch<{ url: string; emailed: boolean }>(`/api/v1/clients/${id}/portal-invite`, { method: 'POST' })
    if (r.data?.url) {
      setInviteUrl(r.data.url)
      setInviteMsg(r.data.emailed ? 'Invite emailed to the customer. You can also copy the link below.' : 'Invite link created — copy and send it to your customer.')
    } else {
      setInviteMsg(r.message || r.error || 'Could not create the invite.')
    }
    setInviting(false)
  }

  useEffect(() => {
    async function load() {
      const [{ data: clientData }, { data: jobData }, { data: invData }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('jobs').select('id, title, status, trade, estimated_value, scheduled_start, created_at')
          .eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('invoices').select('id, invoice_number, status, total, balance_due, issue_date, public_token')
          .eq('client_id', id).order('issue_date', { ascending: false }),
      ])
      if (clientData) setClient(clientData)
      if (jobData) setJobs(jobData)
      if (invData) setInvoices(invData)
      setLoading(false)
    }
    load()
  }, [id])

  const handleArchive = async () => {
    if (!confirm('Archive this customer? They will be hidden from your list.')) return
    await supabase.from('clients').update({ is_deleted: true }).eq('id', id)
    router.push('/customers')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }, { label: 'Not Found', href: '#' }]} />
        <div className="max-w-3xl mx-auto p-8 text-center">
          <p className="text-gray-500 font-medium">Customer not found.</p>
          <Link href="/customers" className="text-teal-600 text-sm mt-2 inline-block hover:text-teal-700">← Back to Customers</Link>
        </div>
      </div>
    )
  }

  const fullName = `${client.first_name} ${client.last_name}`
  const location = [client.address_line1, client.city && client.state ? `${client.city}, ${client.state} ${client.zip_code || ''}`.trim() : null].filter(Boolean).join(' · ')
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0)

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'jobs', label: 'Jobs', count: jobs.length },
    { id: 'invoices', label: 'Invoices', count: invoices.length },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Customers', href: '/customers' },
        { label: fullName, href: '#' },
      ]} />
      <main className="max-w-4xl mx-auto p-4 md:p-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-200 transition">
              <ArrowLeft size={16} className="text-gray-500" />
            </button>
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-teal-700 font-bold text-lg">{client.first_name[0]}{client.last_name[0]}</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Customer</p>
              <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
              {location && <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1"><MapPin size={11} /> {location}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/new-job?client_id=${id}`}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition">
              <Briefcase size={12} /> New Job
            </Link>
            <Link href={`/dashboard/invoices/new?client_id=${id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition">
              <FileText size={12} /> New Invoice
            </Link>
            <Link href={`/customers/${id}/edit`}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition">
              <Pencil size={12} /> Edit
            </Link>
            <button onClick={invitePortal} disabled={inviting}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition disabled:opacity-50">
              <UserPlus size={12} /> {inviting ? 'Creating…' : 'Invite to portal'}
            </button>
            <button onClick={handleArchive}
              className="flex items-center gap-1.5 px-3 py-2 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold rounded-xl transition">
              <Trash2 size={12} /> Archive
            </button>
          </div>
        </div>

        {(inviteUrl || inviteMsg) && (
          <div className="mb-6 bg-teal-50 border border-teal-200 rounded-xl p-3">
            {inviteMsg && <p className="text-xs text-teal-800 mb-2">{inviteMsg}</p>}
            {inviteUrl && (
              <div className="flex items-center gap-2">
                <input readOnly value={inviteUrl}
                  className="flex-1 bg-white border border-teal-200 rounded-lg px-2 py-1.5 text-xs text-gray-700" />
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteUrl); setInviteMsg('Link copied to clipboard.') }}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg">
                  Copy
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">Total Jobs</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">Invoices</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">{totalPaid > 0 ? `$${Number(totalPaid).toLocaleString()}` : '—'}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">Total Paid</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                tab === t.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === t.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Contact Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex items-start gap-3">
                  <Phone size={15} className="text-teal-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Phone</p>
                    {client.phone
                      ? <a href={`tel:${client.phone}`} className="text-sm text-gray-900 hover:text-teal-600">{client.phone}</a>
                      : <p className="text-sm text-gray-300 italic">Not provided</p>}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail size={15} className="text-teal-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Email</p>
                    {client.email
                      ? <a href={`mailto:${client.email}`} className="text-sm text-gray-900 hover:text-teal-600">{client.email}</a>
                      : <p className="text-sm text-gray-300 italic">Not provided</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Property Address</p>
              <div className="flex items-start gap-3">
                <MapPin size={15} className="text-teal-600 mt-0.5 shrink-0" />
                <div className="space-y-0.5 text-sm text-gray-700">
                  {client.address_line1 ? <p>{client.address_line1}</p> : null}
                  {client.address_line2 ? <p>{client.address_line2}</p> : null}
                  {(client.city || client.state) ? (
                    <p>{[client.city, client.state].filter(Boolean).join(', ')}{client.zip_code ? ` ${client.zip_code}` : ''}</p>
                  ) : null}
                  {!client.address_line1 && !client.city && <p className="text-gray-300 italic">No address on file</p>}
                </div>
              </div>
            </div>

            {client.notes && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Customer Since</p>
              <p className="text-sm text-gray-700">{new Date(client.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
        )}

        {/* ── Jobs ── */}
        {tab === 'jobs' && (
          <div>
            <div className="flex justify-end mb-3">
              <Link href={`/new-job?client_id=${id}`}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition">
                <Plus size={13} /> New Job
              </Link>
            </div>
            {jobs.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <Briefcase size={28} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">No jobs yet for this customer.</p>
                <Link href={`/new-job?client_id=${id}`} className="inline-flex items-center gap-1.5 mt-3 text-teal-600 text-sm font-semibold hover:text-teal-700">
                  <Plus size={13} /> Create First Job
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {jobs.map(job => {
                  const s = JOB_STATUS[job.status] || JOB_STATUS.pending
                  return (
                    <div key={job.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-gray-200 transition">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{job.title}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {job.trade && <span className="text-xs text-gray-500">{job.trade}</span>}
                          {job.scheduled_start && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar size={10} />
                              {new Date(job.scheduled_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-gray-400">{s.label}</span>
                        </div>
                      </div>
                      {job.estimated_value != null && (
                        <div className="hidden sm:flex items-center gap-0.5 text-sm font-semibold text-gray-700 shrink-0">
                          <DollarSign size={12} className="text-gray-400" />
                          {Number(job.estimated_value).toLocaleString()}
                        </div>
                      )}
                      <Link href={`/dashboard/jobs/${job.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-xl transition shrink-0">
                        <Eye size={12} /> View
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Invoices ── */}
        {tab === 'invoices' && (
          <div>
            <div className="flex justify-end mb-3">
              <Link href={`/dashboard/invoices/new?client_id=${id}`}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition">
                <Plus size={13} /> New Invoice
              </Link>
            </div>
            {invoices.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <FileText size={28} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">No invoices yet for this customer.</p>
                <Link href={`/dashboard/invoices/new?client_id=${id}`} className="inline-flex items-center gap-1.5 mt-3 text-teal-600 text-sm font-semibold hover:text-teal-700">
                  <Plus size={13} /> Create First Invoice
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map(inv => {
                  const s = INV_STATUS[inv.status] || INV_STATUS.draft
                  return (
                    <div key={inv.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-gray-200 transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm">{inv.invoice_number}</p>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(inv.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">${Number(inv.total).toFixed(2)}</p>
                        {Number(inv.balance_due) > 0 && inv.status !== 'paid' && (
                          <p className="text-xs text-orange-600 font-semibold">${Number(inv.balance_due).toFixed(2)} due</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link href={`/dashboard/invoices/${inv.id}`}
                          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-xl transition">
                          <Eye size={12} /> View
                        </Link>
                        <Link href={`/invoice/${inv.public_token}`} target="_blank"
                          className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-xl transition">
                          Portal
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
