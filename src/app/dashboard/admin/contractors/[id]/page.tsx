'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Shield, Save, Users, Briefcase, FileText, Globe,
  AlertTriangle, Trash2, ExternalLink, Edit3, AlertCircle, UserCog,
  Mail, Phone, Building2, DollarSign, TrendingUp
} from 'lucide-react'
import Breadcrumbs from '../../../../../components/Breadcrumbs'
import { apiFetch } from '../../../../../lib/api-fetch'
import { useIsAdmin } from '../../../../../lib/admin'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  business_name: string | null
  phone: string | null
  created_at: string
}

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  is_deleted: boolean
}

interface Job {
  id: string
  title: string
  status: string | null
  stage: string | null
  estimated_value: number | null
  scheduled_start: string | null
}

interface Invoice {
  id: string
  invoice_number: string
  status: string
  total: number
  amount_paid: number
  balance_due: number
  issue_date: string
}

interface Technician {
  id: string
  name: string
  is_active: boolean
}

interface Website {
  id: string
  slug: string
  published: boolean
  business_name: string | null
}

type Tab = 'overview' | 'customers' | 'jobs' | 'invoices' | 'team' | 'website'

export default function AdminContractorDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { isAdmin, loading: adminLoading } = useIsAdmin()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [website, setWebsite] = useState<Website | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    business_name: '',
    email: '',
    phone: '',
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const r = await apiFetch<{
      profile: Profile
      clients: Client[]
      jobs: Job[]
      invoices: Invoice[]
      technicians: Technician[]
      website: Website | null
    }>(`/api/v1/admin/contractors/${id}`)

    if (r.data?.profile) {
      const prof = r.data.profile
      setProfile(prof)
      setEditForm({
        full_name: prof.full_name || '',
        business_name: prof.business_name || '',
        email: prof.email || '',
        phone: prof.phone || '',
      })
      setClients(r.data.clients || [])
      setJobs(r.data.jobs || [])
      setInvoices(r.data.invoices || [])
      setTechnicians(r.data.technicians || [])
      setWebsite(r.data.website || null)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    if (isAdmin) fetchAll()
  }, [isAdmin, fetchAll])

  const handleSaveProfile = async () => {
    setSaving(true)
    const r = await apiFetch<{ profile: Profile }>(`/api/v1/admin/contractors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(editForm),
    })
    if (r.data?.profile) {
      setProfile(r.data.profile)
      setEditing(false)
    } else {
      alert('Failed to update: ' + (r.message || r.error || 'unknown error'))
    }
    setSaving(false)
  }

  const deleteRecord = async (table: string, recordId: string, label: string, callback: () => void) => {
    if (!confirm(`Delete this ${label}? This cannot be undone.`)) return
    const r = await apiFetch(`/api/v1/admin/records/${table}/${recordId}`, { method: 'DELETE' })
    if (r.status >= 400) alert('Delete failed: ' + (r.message || r.error || 'unknown error'))
    else callback()
  }

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <AlertTriangle size={32} className="text-red-500 mb-3" />
        <p className="text-lg font-bold text-gray-900">Access denied</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-lg font-bold text-gray-900">Contractor not found</p>
        <Link href="/dashboard/admin" className="text-sm text-purple-600 hover:text-purple-700 mt-2">← Back to Admin</Link>
      </div>
    )
  }

  const initials = (profile.full_name || profile.email || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.amount_paid || 0), 0)
  const totalOutstanding = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'draft')
    .reduce((sum, i) => sum + Number(i.balance_due || 0), 0)
  const activeJobs = jobs.filter(j => j.status === 'pending' || j.status === 'assigned' || j.status === 'in_progress').length
  const activeClients = clients.filter(c => !c.is_deleted).length
  const activeTechs = technicians.filter(t => t.is_active).length

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[
        { label: 'Admin', href: '/dashboard/admin' },
        { label: profile.full_name || 'Contractor', href: `/dashboard/admin/contractors/${id}` },
      ]} />

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-purple-600" />
            <p className="text-xs font-bold uppercase tracking-widest text-purple-600">Admin View</p>
          </div>
        </div>

        {/* Contractor card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-lg font-bold">
                {initials}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{profile.full_name || 'Unnamed Contractor'}</h1>
                <p className="text-sm text-gray-500">{profile.business_name || 'No business name'}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                  {profile.email && <span className="flex items-center gap-1"><Mail size={10} />{profile.email}</span>}
                  {profile.phone && <span className="flex items-center gap-1"><Phone size={10} />{profile.phone}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition">
                  <Edit3 size={12} /> Edit Profile
                </button>
              ) : (
                <>
                  <button onClick={() => setEditing(false)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSaveProfile} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                    <Save size={12} /> {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>

          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5 border-t border-gray-100">
              <Field label="Full Name">
                <input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
              </Field>
              <Field label="Business Name">
                <input value={editForm.business_name} onChange={e => setEditForm(f => ({ ...f, business_name: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
              </Field>
              <Field label="Email">
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
              </Field>
              <Field label="Phone">
                <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
              </Field>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-5 border-t border-gray-100 mt-5">
            <MiniStat icon={<Users size={13} />} label="Customers" value={String(activeClients)} />
            <MiniStat icon={<UserCog size={13} />} label="Team" value={String(activeTechs)} />
            <MiniStat icon={<Briefcase size={13} />} label="Active Jobs" value={String(activeJobs)} sub={`${jobs.length} total`} />
            <MiniStat icon={<DollarSign size={13} />} label="Revenue" value={`$${totalRevenue.toLocaleString()}`} />
            <MiniStat icon={<TrendingUp size={13} />} label="Outstanding" value={`$${totalOutstanding.toLocaleString()}`} color="orange" />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {([
              { id: 'overview', label: 'Overview', icon: Building2 },
              { id: 'customers', label: `Customers (${activeClients})`, icon: Users },
              { id: 'team', label: `Team (${activeTechs})`, icon: UserCog },
              { id: 'jobs', label: `Jobs (${jobs.length})`, icon: Briefcase },
              { id: 'invoices', label: `Invoices (${invoices.length})`, icon: FileText },
              { id: 'website', label: 'Website', icon: Globe },
            ] as const).map(t => {
              const Icon = t.icon
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold transition whitespace-nowrap ${
                    tab === t.id
                      ? 'border-b-2 border-purple-500 text-purple-700'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}>
                  <Icon size={13} /> {t.label}
                </button>
              )
            })}
          </div>

          <div className="p-6">
            {tab === 'overview' && (
              <OverviewTab profile={profile} jobs={jobs} invoices={invoices} clients={clients} />
            )}

            {tab === 'customers' && (
              <DataList
                items={clients}
                emptyText="No customers yet."
                renderRow={(c) => (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {c.first_name} {c.last_name}
                        {c.is_deleted && <span className="ml-2 text-[10px] text-red-500">(archived)</span>}
                      </p>
                      <p className="text-xs text-gray-400">{c.email || c.phone || 'No contact'}</p>
                    </div>
                    <button onClick={() => deleteRecord('clients', c.id, 'customer', () => setClients(prev => prev.filter(x => x.id !== c.id)))}
                      className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={13} /></button>
                  </>
                )}
              />
            )}

            {tab === 'team' && (
              <DataList
                items={technicians}
                emptyText="No technicians."
                renderRow={(t) => (
                  <>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.is_active ? 'Active' : 'Inactive'}</p>
                    </div>
                    <button onClick={() => deleteRecord('technicians', t.id, 'technician', () => setTechnicians(prev => prev.filter(x => x.id !== t.id)))}
                      className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={13} /></button>
                  </>
                )}
              />
            )}

            {tab === 'jobs' && (
              <DataList
                items={jobs}
                emptyText="No jobs created yet."
                renderRow={(j) => (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{j.title}</p>
                      <p className="text-xs text-gray-400">
                        {j.stage} • {j.status || 'pending'}
                        {j.scheduled_start && ` • ${new Date(j.scheduled_start).toLocaleDateString()}`}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-700 mr-3">${Number(j.estimated_value || 0).toLocaleString()}</p>
                    <button onClick={() => deleteRecord('jobs', j.id, 'job', () => setJobs(prev => prev.filter(x => x.id !== j.id)))}
                      className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={13} /></button>
                  </>
                )}
              />
            )}

            {tab === 'invoices' && (
              <DataList
                items={invoices}
                emptyText="No invoices yet."
                renderRow={(i) => (
                  <>
                    <div className="flex-1">
                      <Link href={`/dashboard/invoices/${i.id}`} className="text-sm font-bold text-gray-900 hover:text-purple-600">
                        {i.invoice_number}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {i.status} • {new Date(i.issue_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right mr-3">
                      <p className="text-sm font-bold text-gray-900">${Number(i.total).toFixed(2)}</p>
                      {Number(i.balance_due) > 0 ? (
                        <p className="text-xs text-orange-600 font-semibold">${Number(i.balance_due).toFixed(2)} due</p>
                      ) : Number(i.total) > 0 ? (
                        <p className="text-xs text-green-600 font-semibold">PAID</p>
                      ) : null}
                    </div>
                    <button onClick={() => deleteRecord('invoices', i.id, 'invoice', () => setInvoices(prev => prev.filter(x => x.id !== i.id)))}
                      className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={13} /></button>
                  </>
                )}
              />
            )}

            {tab === 'website' && (
              <div>
                {website ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <Globe size={18} className="text-teal-600" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">
                          {website.business_name || profile.business_name || 'Website'}
                        </p>
                        <p className="text-xs text-gray-400">/sites/{website.slug}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                        website.published ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {website.published ? 'Published' : 'Draft'}
                      </span>
                      {website.published && (
                        <Link href={`/sites/${website.slug}`} target="_blank"
                          className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700">
                          <ExternalLink size={11} /> View
                        </Link>
                      )}
                    </div>
                    <button onClick={() => deleteRecord('contractor_websites', website.id, 'website', () => setWebsite(null))}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1">
                      <Trash2 size={11} /> Delete Website
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">No website created yet.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Danger zone */}
        <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800">Danger Zone</p>
              <p className="text-xs text-red-600 mt-1 mb-3">
                Permanently delete this contractor and all their data (customers, jobs, invoices, technicians, website).
                This cannot be undone.
              </p>
              <button onClick={async () => {
                if (!confirm(`Permanently delete ${profile.full_name} and ALL their data?\n\nThis includes:\n• ${activeClients} customers\n• ${jobs.length} jobs\n• ${invoices.length} invoices\n• ${activeTechs} technicians\n• Website if any\n\nThis cannot be undone.`)) return
                if (!confirm('Are you absolutely sure?')) return
                const r = await apiFetch(`/api/v1/admin/contractors/${id}`, { method: 'DELETE' })
                if (r.status >= 400) alert('Delete failed: ' + (r.message || r.error || 'unknown error'))
                else router.push('/dashboard/admin')
              }}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition">
                <Trash2 size={11} /> Delete Contractor & All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function MiniStat({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: 'orange'
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-lg font-bold ${color === 'orange' ? 'text-orange-600' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  )
}

interface DataListItem {
  id: string
}

function DataList<T extends DataListItem>({ items, emptyText, renderRow }: {
  items: T[]; emptyText: string; renderRow: (item: T) => React.ReactNode
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">{emptyText}</p>
  }
  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition">
          {renderRow(item)}
        </div>
      ))}
    </div>
  )
}

function OverviewTab({ profile, jobs, invoices, clients }: {
  profile: Profile; jobs: Job[]; invoices: Invoice[]; clients: Client[]
}) {
  const monthStart = new Date()
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const newClientsThisMonth = clients.filter(c => !c.is_deleted).length // can't filter without created_at on clients in this query
  const recentJobs = jobs.slice(0, 5)
  const recentInvoices = invoices.slice(0, 5)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Account Info</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">User ID</span>
            <span className="text-xs font-mono text-gray-700">{profile.id.slice(0, 8)}…</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Joined</span>
            <span className="text-gray-700">{new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total Customers</span>
            <span className="font-semibold text-gray-700">{newClientsThisMonth}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total Jobs</span>
            <span className="font-semibold text-gray-700">{jobs.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total Invoices</span>
            <span className="font-semibold text-gray-700">{invoices.length}</span>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Recent Activity</p>
        {recentJobs.length === 0 && recentInvoices.length === 0 ? (
          <p className="text-sm text-gray-400">No recent activity.</p>
        ) : (
          <div className="space-y-2">
            {recentInvoices.slice(0, 3).map(i => (
              <div key={i.id} className="flex items-center gap-2 text-xs">
                <FileText size={11} className="text-gray-300" />
                <span className="font-semibold text-gray-700">{i.invoice_number}</span>
                <span className="text-gray-400">— ${Number(i.total).toFixed(2)} {i.status}</span>
              </div>
            ))}
            {recentJobs.slice(0, 3).map(j => (
              <div key={j.id} className="flex items-center gap-2 text-xs">
                <Briefcase size={11} className="text-gray-300" />
                <span className="font-semibold text-gray-700 truncate">{j.title}</span>
                <span className="text-gray-400 shrink-0">— {j.stage}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
