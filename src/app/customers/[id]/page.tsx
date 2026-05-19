'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Phone, Mail, MapPin, FileText, ArrowLeft, Pencil, Trash2, Plus, Briefcase,
  DollarSign, Calendar, Eye, UserPlus, ShieldCheck, Building2, Globe, User,
  StickyNote, MessageSquare, Activity as ActivityIcon, CheckCircle2, Circle, Trash,
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase-client'
import { apiFetch } from '../../../lib/api-fetch'
import Breadcrumbs from '../../../components/Breadcrumbs'
import AddressMapPreview from '../../../components/AddressMapPreview'
import { LIFECYCLE_META, DEAL_STAGES, DEAL_STAGE_META, titleCase } from '../../../lib/crm'

type Tab = 'overview' | 'activity' | 'tasks' | 'contacts' | 'deals' | 'jobs' | 'invoices'

interface Client {
  id: string; first_name: string; last_name: string
  client_type: string | null; company_name: string | null
  lifecycle_status: string | null; lead_source: string | null; website: string | null
  tags: string[] | null
  phone: string | null; email: string | null
  address_line1: string | null; address_line2: string | null
  city: string | null; state: string | null; zip_code: string | null; county: string | null
  latitude: number | null; longitude: number | null
  formatted_address: string | null; address_verified: boolean | null
  notes: string | null; created_at: string
}
interface Job { id: string; title: string; status: string; trade: string | null; estimated_value: number | null; scheduled_start: string | null; created_at: string }
interface Invoice { id: string; invoice_number: string; status: string; total: number; balance_due: number; issue_date: string; public_token: string }
interface Act { id: string; type: string; subject: string | null; body: string | null; occurred_at: string }
interface Task { id: string; title: string; description: string | null; due_at: string | null; priority: string; status: string }
interface Contact { id: string; first_name: string; last_name: string | null; title: string | null; email: string | null; phone: string | null; is_primary: boolean }
interface Deal { id: string; name: string; stage: string; value: number; probability: number; expected_close_date: string | null }

const JOB_STATUS: Record<string, { dot: string; label: string }> = {
  pending: { dot: 'bg-yellow-400', label: 'Pending' }, assigned: { dot: 'bg-blue-500', label: 'Assigned' },
  in_progress: { dot: 'bg-orange-500', label: 'In Progress' }, completed: { dot: 'bg-green-500', label: 'Completed' },
  cancelled: { dot: 'bg-gray-400', label: 'Cancelled' },
}
const INV_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' }, sent: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Sent' },
  viewed: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Viewed' }, partially_paid: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Partial' },
  paid: { bg: 'bg-green-50', text: 'text-green-700', label: 'Paid' }, overdue: { bg: 'bg-red-50', text: 'text-red-700', label: 'Overdue' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled' },
}
const ACT_ICON: Record<string, typeof StickyNote> = {
  note: StickyNote, call: Phone, email: Mail, sms: MessageSquare, meeting: Calendar, system: ActivityIcon,
}
const card = 'bg-white rounded-2xl border border-gray-100 shadow-sm'
const inputCls = 'w-full bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition outline-none'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [acts, setActs] = useState<Act[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [c, j, inv, a, t, ct, d] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('jobs').select('id, title, status, trade, estimated_value, scheduled_start, created_at').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('id, invoice_number, status, total, balance_due, issue_date, public_token').eq('client_id', id).order('issue_date', { ascending: false }),
      supabase.from('client_activities').select('id, type, subject, body, occurred_at').eq('client_id', id).order('occurred_at', { ascending: false }),
      supabase.from('client_tasks').select('id, title, description, due_at, priority, status').eq('client_id', id).order('due_at', { ascending: true, nullsFirst: false }),
      supabase.from('client_contacts').select('id, first_name, last_name, title, email, phone, is_primary').eq('client_id', id).order('is_primary', { ascending: false }),
      supabase.from('client_deals').select('id, name, stage, value, probability, expected_close_date').eq('client_id', id).order('created_at', { ascending: false }),
    ])
    if (c.data) setClient(c.data)
    setJobs(j.data || [])
    setInvoices(inv.data || [])
    setActs(a.data || [])
    setTasks(t.data || [])
    setContacts(ct.data || [])
    setDeals(d.data || [])
    setLoading(false)
  }, [id])

  useEffect(() => { reload() }, [reload])

  const invitePortal = async () => {
    setInviting(true); setInviteMsg(null)
    const r = await apiFetch<{ url: string; emailed: boolean }>(`/api/v1/clients/${id}/portal-invite`, { method: 'POST' })
    if (r.data?.url) {
      setInviteUrl(r.data.url)
      setInviteMsg(r.data.emailed ? 'Invite emailed to the customer. You can also copy the link below.' : 'Invite link created — copy and send it to your customer.')
    } else {
      const det = (r as { details?: unknown }).details
      const detail = det == null ? '' : typeof det === 'string' ? det : JSON.stringify(det)
      setInviteMsg(`${r.message || r.error || 'Could not create the invite.'}${detail ? ` — ${detail}` : ''}`)
    }
    setInviting(false)
  }

  const handleArchive = async () => {
    if (!confirm('Archive this customer? They will be hidden from your list.')) return
    await supabase.from('clients').update({ is_deleted: true }).eq('id', id)
    router.push('/customers')
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" /></div>
  }
  if (!client) {
    return <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }, { label: 'Not Found', href: '#' }]} />
      <div className="max-w-3xl mx-auto p-8 text-center">
        <p className="text-gray-500 font-medium">Customer not found.</p>
        <Link href="/customers" className="text-teal-600 text-sm mt-2 inline-block hover:text-teal-700">← Back to Customers</Link>
      </div></div>
  }

  const isCompany = client.client_type === 'company'
  const fullName = isCompany && client.company_name ? client.company_name : `${client.first_name} ${client.last_name}`.trim()
  const status = LIFECYCLE_META[client.lifecycle_status || 'lead'] || LIFECYCLE_META.lead
  const location = [client.address_line1, client.city && client.state ? `${client.city}, ${client.state} ${client.zip_code || ''}`.trim() : null].filter(Boolean).join(' · ')
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0)
  const openTasks = tasks.filter(t => t.status === 'open').length
  const openDealValue = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').reduce((s, d) => s + Number(d.value || 0), 0)

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity', count: acts.length },
    { id: 'tasks', label: 'Tasks', count: openTasks },
    { id: 'contacts', label: 'Contacts', count: contacts.length },
    { id: 'deals', label: 'Deals', count: deals.length },
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
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center shrink-0 text-teal-700 font-bold text-lg">
              {isCompany ? <Building2 size={20} /> : `${client.first_name[0] || ''}${client.last_name[0] || ''}`}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">{isCompany ? 'Company' : 'Customer'}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>{status.label}</span>
                {client.address_verified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                    <ShieldCheck size={11} /> Verified
                  </span>
                )}
              </div>
              {location && <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1"><MapPin size={11} /> {location}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/new-job?client_id=${id}`} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition"><Briefcase size={12} /> New Job</Link>
            <Link href={`/dashboard/invoices/new?client_id=${id}`} className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition"><FileText size={12} /> New Invoice</Link>
            <Link href={`/customers/${id}/edit`} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition"><Pencil size={12} /> Edit</Link>
            <button onClick={invitePortal} disabled={inviting} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition disabled:opacity-50"><UserPlus size={12} /> {inviting ? 'Creating…' : 'Invite to portal'}</button>
            <button onClick={handleArchive} className="flex items-center gap-1.5 px-3 py-2 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold rounded-xl transition"><Trash2 size={12} /> Archive</button>
          </div>
        </div>

        {(inviteUrl || inviteMsg) && (
          <div className="mb-6 bg-teal-50 border border-teal-200 rounded-xl p-3">
            {inviteMsg && <p className="text-xs text-teal-800 mb-2">{inviteMsg}</p>}
            {inviteUrl && (
              <div className="flex items-center gap-2">
                <input readOnly value={inviteUrl} className="flex-1 bg-white border border-teal-200 rounded-lg px-2 py-1.5 text-xs text-gray-700" />
                <button onClick={() => { navigator.clipboard.writeText(inviteUrl); setInviteMsg('Link copied to clipboard.') }} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg">Copy</button>
              </div>
            )}
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Stat label="Total Jobs" value={String(jobs.length)} />
          <Stat label="Open Tasks" value={String(openTasks)} />
          <Stat label="Pipeline" value={openDealValue > 0 ? `$${openDealValue.toLocaleString()}` : '—'} />
          <Stat label="Total Paid" value={totalPaid > 0 ? `$${totalPaid.toLocaleString()}` : '—'} accent />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 w-full overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${tab === t.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === t.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-4">
            <div className={`${card} p-6`}>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Contact Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field icon={<Phone size={15} className="text-teal-600" />} label="Phone">
                  {client.phone ? <a href={`tel:${client.phone}`} className="text-sm text-gray-900 hover:text-teal-600">{client.phone}</a> : <span className="text-sm text-gray-300 italic">Not provided</span>}
                </Field>
                <Field icon={<Mail size={15} className="text-teal-600" />} label="Email">
                  {client.email ? <a href={`mailto:${client.email}`} className="text-sm text-gray-900 hover:text-teal-600">{client.email}</a> : <span className="text-sm text-gray-300 italic">Not provided</span>}
                </Field>
                {client.website && (
                  <Field icon={<Globe size={15} className="text-teal-600" />} label="Website">
                    <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-900 hover:text-teal-600">{client.website}</a>
                  </Field>
                )}
                {client.lead_source && (
                  <Field icon={<User size={15} className="text-teal-600" />} label="Lead Source">
                    <span className="text-sm text-gray-900">{titleCase(client.lead_source)}</span>
                  </Field>
                )}
              </div>
              {client.tags && client.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-5 pt-4 border-t border-gray-100">
                  {client.tags.map(t => <span key={t} className="bg-teal-50 text-teal-700 text-xs font-semibold px-2 py-1 rounded-full">{t}</span>)}
                </div>
              )}
            </div>

            <div className={`${card} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Property Address</p>
                {client.address_verified && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700"><ShieldCheck size={12} /> Verified</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
                <div className="flex items-start gap-3">
                  <MapPin size={15} className="text-teal-600 mt-0.5 shrink-0" />
                  <div className="space-y-0.5 text-sm text-gray-700">
                    {client.address_line1 && <p>{client.address_line1}</p>}
                    {client.address_line2 && <p>{client.address_line2}</p>}
                    {(client.city || client.state) && <p>{[client.city, client.state].filter(Boolean).join(', ')}{client.zip_code ? ` ${client.zip_code}` : ''}</p>}
                    {client.county && <p className="text-gray-400 text-xs">{client.county} County</p>}
                    {!client.address_line1 && !client.city && <p className="text-gray-300 italic">No address on file</p>}
                  </div>
                </div>
                {(client.latitude != null || client.address_line1) && (
                  <AddressMapPreview latitude={client.latitude} longitude={client.longitude}
                    address={[client.address_line1, client.city, client.state].filter(Boolean).join(', ')} />
                )}
              </div>
            </div>

            {client.notes && (
              <div className={`${card} p-6`}>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}

            <div className={`${card} p-6`}>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Customer Since</p>
              <p className="text-sm text-gray-700">{new Date(client.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
        )}

        {tab === 'activity' && <ActivitySection clientId={id} acts={acts} onChange={reload} />}
        {tab === 'tasks' && <TasksSection clientId={id} tasks={tasks} onChange={reload} />}
        {tab === 'contacts' && <ContactsSection clientId={id} contacts={contacts} onChange={reload} />}
        {tab === 'deals' && <DealsSection clientId={id} deals={deals} onChange={reload} />}

        {tab === 'jobs' && (
          <div>
            <div className="flex justify-end mb-3">
              <Link href={`/new-job?client_id=${id}`} className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition"><Plus size={13} /> New Job</Link>
            </div>
            {jobs.length === 0 ? <Empty icon={<Briefcase size={28} />} text="No jobs yet for this customer." />
              : <div className="space-y-2">{jobs.map(job => {
                const s = JOB_STATUS[job.status] || JOB_STATUS.pending
                return (
                  <div key={job.id} className={`${card} p-4 flex items-center gap-3 hover:border-gray-200 transition`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{job.title}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {job.trade && <span className="text-xs text-gray-500">{job.trade}</span>}
                        {job.scheduled_start && <span className="flex items-center gap-1 text-xs text-gray-500"><Calendar size={10} />{new Date(job.scheduled_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        <span className="text-[11px] font-semibold text-gray-400">{s.label}</span>
                      </div>
                    </div>
                    {job.estimated_value != null && <div className="hidden sm:flex items-center gap-0.5 text-sm font-semibold text-gray-700 shrink-0"><DollarSign size={12} className="text-gray-400" />{Number(job.estimated_value).toLocaleString()}</div>}
                    <Link href={`/dashboard/jobs/${job.id}`} className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-xl transition shrink-0"><Eye size={12} /> View</Link>
                  </div>
                )
              })}</div>}
          </div>
        )}

        {tab === 'invoices' && (
          <div>
            <div className="flex justify-end mb-3">
              <Link href={`/dashboard/invoices/new?client_id=${id}`} className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition"><Plus size={13} /> New Invoice</Link>
            </div>
            {invoices.length === 0 ? <Empty icon={<FileText size={28} />} text="No invoices yet for this customer." />
              : <div className="space-y-2">{invoices.map(inv => {
                const s = INV_STATUS[inv.status] || INV_STATUS.draft
                return (
                  <div key={inv.id} className={`${card} p-4 flex items-center gap-3 hover:border-gray-200 transition`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm">{inv.invoice_number}</p>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(inv.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">${Number(inv.total).toFixed(2)}</p>
                      {Number(inv.balance_due) > 0 && inv.status !== 'paid' && <p className="text-xs text-orange-600 font-semibold">${Number(inv.balance_due).toFixed(2)} due</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link href={`/dashboard/invoices/${inv.id}`} className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-xl transition"><Eye size={12} /> View</Link>
                      <Link href={`/invoice/${inv.public_token}`} target="_blank" className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-xl transition">Portal</Link>
                    </div>
                  </div>
                )
              })}</div>}
          </div>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`${card} p-4 text-center`}>
      <p className={`text-2xl font-bold ${accent ? 'text-teal-600' : 'text-gray-900'}`}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}
function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
      <div className="text-gray-200 mx-auto mb-3 w-fit">{icon}</div>
      <p className="text-gray-500 text-sm font-medium">{text}</p>
    </div>
  )
}

async function contractorId() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user.id || null
}

function ActivitySection({ clientId, acts, onChange }: { clientId: string; acts: Act[]; onChange: () => void }) {
  const [type, setType] = useState('note')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const add = async () => {
    if (!body.trim()) return
    setSaving(true)
    const cid = await contractorId()
    await supabase.from('client_activities').insert({ client_id: clientId, contractor_id: cid, created_by: cid, type, body: body.trim() })
    setBody(''); setSaving(false); onChange()
  }
  return (
    <div className="space-y-4">
      <div className={`${card} p-4`}>
        <div className="flex gap-2 mb-2 flex-wrap">
          {['note', 'call', 'email', 'sms', 'meeting'].map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${type === t ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{titleCase(t)}</button>
          ))}
        </div>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder={`Log a ${type}…`} />
        <div className="flex justify-end mt-2">
          <button onClick={add} disabled={saving || !body.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"><Plus size={13} /> {saving ? 'Saving…' : 'Log Activity'}</button>
        </div>
      </div>
      {acts.length === 0 ? <Empty icon={<ActivityIcon size={28} />} text="No activity logged yet." />
        : <div className="space-y-2">{acts.map(a => {
          const Icon = ACT_ICON[a.type] || StickyNote
          return (
            <div key={a.id} className={`${card} p-4 flex gap-3`}>
              <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center shrink-0"><Icon size={14} className="text-teal-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{titleCase(a.type)}</span>
                  <span className="text-xs text-gray-400">{new Date(a.occurred_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                {a.subject && <p className="text-sm font-semibold text-gray-900 mt-0.5">{a.subject}</p>}
                {a.body && <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{a.body}</p>}
              </div>
            </div>
          )
        })}</div>}
    </div>
  )
}

function TasksSection({ clientId, tasks, onChange }: { clientId: string; tasks: Task[]; onChange: () => void }) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState('normal')
  const [saving, setSaving] = useState(false)
  const add = async () => {
    if (!title.trim()) return
    setSaving(true)
    const cid = await contractorId()
    await supabase.from('client_tasks').insert({ client_id: clientId, contractor_id: cid, assigned_to: cid, title: title.trim(), due_at: due || null, priority })
    setTitle(''); setDue(''); setPriority('normal'); setSaving(false); onChange()
  }
  const toggle = async (t: Task) => {
    await supabase.from('client_tasks').update({ status: t.status === 'done' ? 'open' : 'done', completed_at: t.status === 'done' ? null : new Date().toISOString() }).eq('id', t.id)
    onChange()
  }
  const del = async (tid: string) => { await supabase.from('client_tasks').delete().eq('id', tid); onChange() }
  return (
    <div className="space-y-4">
      <div className={`${card} p-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2`}>
        <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="Follow up with customer…" />
        <input type="datetime-local" value={due} onChange={e => setDue(e.target.value)} className={inputCls} />
        <select value={priority} onChange={e => setPriority(e.target.value)} className={inputCls}>
          <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
        </select>
        <button onClick={add} disabled={saving || !title.trim()} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"><Plus size={13} /> Add</button>
      </div>
      {tasks.length === 0 ? <Empty icon={<CheckCircle2 size={28} />} text="No tasks yet. Add a follow-up reminder." />
        : <div className="space-y-2">{tasks.map(t => {
          const overdue = t.status === 'open' && t.due_at && new Date(t.due_at) < new Date()
          return (
            <div key={t.id} className={`${card} p-4 flex items-center gap-3`}>
              <button onClick={() => toggle(t)} className="shrink-0">
                {t.status === 'done' ? <CheckCircle2 size={18} className="text-green-500" /> : <Circle size={18} className="text-gray-300 hover:text-teal-500" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${t.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{t.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {t.due_at && <span className={`text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{new Date(t.due_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}{overdue ? ' · Overdue' : ''}</span>}
                  {t.priority !== 'normal' && <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${t.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{t.priority}</span>}
                </div>
              </div>
              <button onClick={() => del(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 shrink-0"><Trash size={14} /></button>
            </div>
          )
        })}</div>}
    </div>
  )
}

function ContactsSection({ clientId, contacts, onChange }: { clientId: string; contacts: Contact[]; onChange: () => void }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ first_name: '', last_name: '', title: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const add = async () => {
    if (!f.first_name.trim()) return
    setSaving(true)
    const cid = await contractorId()
    await supabase.from('client_contacts').insert({
      client_id: clientId, contractor_id: cid, first_name: f.first_name.trim(),
      last_name: f.last_name.trim() || null, title: f.title.trim() || null,
      email: f.email.trim() || null, phone: f.phone.trim() || null,
      is_primary: contacts.length === 0,
    })
    setF({ first_name: '', last_name: '', title: '', email: '', phone: '' }); setSaving(false); setOpen(false); onChange()
  }
  const del = async (cid: string) => { await supabase.from('client_contacts').delete().eq('id', cid); onChange() }
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition"><Plus size={13} /> Add Contact</button>
      </div>
      {open && (
        <div className={`${card} p-4 grid grid-cols-1 sm:grid-cols-2 gap-2`}>
          <input value={f.first_name} onChange={e => setF({ ...f, first_name: e.target.value })} className={inputCls} placeholder="First name *" />
          <input value={f.last_name} onChange={e => setF({ ...f, last_name: e.target.value })} className={inputCls} placeholder="Last name" />
          <input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className={inputCls} placeholder="Title (e.g. Property Manager)" />
          <input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} className={inputCls} placeholder="Phone" />
          <input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} className={`${inputCls} sm:col-span-2`} placeholder="Email" />
          <div className="sm:col-span-2 flex justify-end">
            <button onClick={add} disabled={saving || !f.first_name.trim()} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50">{saving ? 'Saving…' : 'Save Contact'}</button>
          </div>
        </div>
      )}
      {contacts.length === 0 ? <Empty icon={<User size={28} />} text="No additional contacts yet." />
        : <div className="space-y-2">{contacts.map(ct => (
          <div key={ct.id} className={`${card} p-4 flex items-center gap-3`}>
            <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs shrink-0">{ct.first_name[0]}{ct.last_name?.[0] || ''}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{ct.first_name} {ct.last_name}</p>
                {ct.is_primary && <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-full">Primary</span>}
              </div>
              <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-0.5">
                {ct.title && <span>{ct.title}</span>}
                {ct.phone && <a href={`tel:${ct.phone}`} className="hover:text-teal-600">{ct.phone}</a>}
                {ct.email && <a href={`mailto:${ct.email}`} className="hover:text-teal-600">{ct.email}</a>}
              </div>
            </div>
            <button onClick={() => del(ct.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 shrink-0"><Trash size={14} /></button>
          </div>
        ))}</div>}
    </div>
  )
}

function DealsSection({ clientId, deals, onChange }: { clientId: string; deals: Deal[]; onChange: () => void }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', value: '', expected_close_date: '' })
  const [saving, setSaving] = useState(false)
  const add = async () => {
    if (!f.name.trim()) return
    setSaving(true)
    const cid = await contractorId()
    await supabase.from('client_deals').insert({
      client_id: clientId, contractor_id: cid, name: f.name.trim(),
      value: Number(f.value) || 0, expected_close_date: f.expected_close_date || null,
    })
    setF({ name: '', value: '', expected_close_date: '' }); setSaving(false); setOpen(false); onChange()
  }
  const setStage = async (d: Deal, stage: string) => {
    await supabase.from('client_deals').update({ stage, closed_at: (stage === 'won' || stage === 'lost') ? new Date().toISOString() : null }).eq('id', d.id)
    onChange()
  }
  const del = async (did: string) => { await supabase.from('client_deals').delete().eq('id', did); onChange() }
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition"><Plus size={13} /> Add Deal</button>
      </div>
      {open && (
        <div className={`${card} p-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2`}>
          <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className={inputCls} placeholder="Deal name (e.g. Kitchen remodel)" />
          <input value={f.value} onChange={e => setF({ ...f, value: e.target.value })} type="number" className={inputCls} placeholder="Value $" />
          <input value={f.expected_close_date} onChange={e => setF({ ...f, expected_close_date: e.target.value })} type="date" className={inputCls} />
          <button onClick={add} disabled={saving || !f.name.trim()} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50">{saving ? '…' : 'Add'}</button>
        </div>
      )}
      {deals.length === 0 ? <Empty icon={<DollarSign size={28} />} text="No deals in the pipeline yet." />
        : <div className="space-y-2">{deals.map(d => {
          const sm = DEAL_STAGE_META[d.stage] || DEAL_STAGE_META.lead
          return (
            <div key={d.id} className={`${card} p-4 flex items-center gap-3 flex-wrap`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">${Number(d.value).toLocaleString()}</span>
                  {d.expected_close_date && <span>· Close {new Date(d.expected_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                </div>
              </div>
              <select value={d.stage} onChange={e => setStage(d, e.target.value)}
                className={`text-xs font-bold px-2 py-1 rounded-full border-0 cursor-pointer ${sm.bg} ${sm.text}`}>
                {DEAL_STAGES.map(s => <option key={s} value={s}>{DEAL_STAGE_META[s].label}</option>)}
              </select>
              <button onClick={() => del(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 shrink-0"><Trash size={14} /></button>
            </div>
          )
        })}</div>}
    </div>
  )
}
