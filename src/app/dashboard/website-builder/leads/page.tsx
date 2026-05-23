'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '../../../../lib/supabase-client'
import {
  Inbox, ChevronLeft, Mail, Phone, MessageSquare, MapPin, Calendar, DollarSign,
  Trash2, Filter, ArrowLeft, ExternalLink,
} from 'lucide-react'

interface Lead {
  id: string
  contractor_id: string
  website_id: string | null
  slug: string
  name: string
  email: string | null
  phone: string | null
  message: string | null
  service_interest: string | null
  preferred_contact: string | null
  preferred_time: string | null
  budget_range: string | null
  project_address: string | null
  project_city: string | null
  project_zip: string | null
  source: string
  status: string
  notes: string | null
  created_at: string
}

const STATUS_OPTIONS = [
  { id: 'new',       label: 'New',       color: 'bg-blue-100 text-blue-700' },
  { id: 'contacted', label: 'Contacted', color: 'bg-amber-100 text-amber-700' },
  { id: 'quoted',    label: 'Quoted',    color: 'bg-purple-100 text-purple-700' },
  { id: 'won',       label: 'Won',       color: 'bg-green-100 text-green-700' },
  { id: 'lost',      label: 'Lost',      color: 'bg-gray-200 text-gray-600' },
  { id: 'spam',      label: 'Spam',      color: 'bg-red-100 text-red-700' },
] as const

function statusMeta(id: string) {
  return STATUS_OPTIONS.find(s => s.id === id) || STATUS_OPTIONS[0]
}

function fmtDate(s: string) {
  const d = new Date(s)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  if (sameDay) return `Today ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function LeadsInboxPage() {
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [savingNote, setSavingNote] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const res = await fetch('/api/website-leads', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = await res.json()
    if (res.ok) {
      setLeads(data.leads || [])
      if (!selectedId && data.leads?.length) setSelectedId(data.leads[0].id)
    } else {
      setError(data.message || 'Failed to load leads')
    }
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return leads
    return leads.filter(l => l.status === filter)
  }, [leads, filter])

  const selected = useMemo(() => leads.find(l => l.id === selectedId) || null, [leads, selectedId])

  async function updateLead(id: string, patch: Partial<Lead>) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`/api/website-leads/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(patch),
    })
    const data = await res.json()
    if (res.ok && data.lead) {
      setLeads(prev => prev.map(l => l.id === id ? data.lead : l))
    } else {
      setError(data.message || 'Failed to update')
    }
  }

  async function deleteLead(id: string) {
    if (!confirm('Delete this lead? This cannot be undone.')) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`/api/website-leads/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    setLeads(prev => prev.filter(l => l.id !== id))
    setSelectedId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-14 md:pt-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/dashboard/website-builder" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft size={12} /> Back to Website Builder
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Inbox size={18} className="text-amber-600" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Leads Inbox</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">Messages from visitors to your website's contact form.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={12} className="text-gray-400" />
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          All ({leads.length})
        </button>
        {STATUS_OPTIONS.map(s => {
          const count = leads.filter(l => l.status === s.id).length
          if (count === 0 && s.id !== 'new') return null
          return (
            <button key={s.id} onClick={() => setFilter(s.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${filter === s.id ? 'bg-gray-900 text-white' : s.color + ' hover:opacity-80'}`}>
              {s.label} ({count})
            </button>
          )
        })}
      </div>

      {leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <Inbox size={24} className="text-gray-300" />
          </div>
          <p className="font-semibold text-gray-900 mb-1">No leads yet</p>
          <p className="text-xs text-gray-500 mb-4">Once visitors submit your contact form, their messages will appear here.</p>
          <Link href="/dashboard/website-builder"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition">
            Edit your website
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* List */}
          <div className={`lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${selected ? 'hidden lg:block' : ''}`}>
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <p className="p-6 text-sm text-gray-400 text-center">No leads match this filter.</p>
              ) : filtered.map(lead => {
                const meta = statusMeta(lead.status)
                const isSelected = lead.id === selectedId
                return (
                  <button key={lead.id} onClick={() => setSelectedId(lead.id)}
                    className={`w-full text-left px-4 py-3 transition ${isSelected ? 'bg-teal-50/40 border-l-2 border-teal-500' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm text-gray-900 truncate">{lead.name}</span>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.color}`}>{meta.label}</span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">{lead.service_interest || lead.message || '(no message)'}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{fmtDate(lead.created_at)}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Detail */}
          <div className={`lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 ${selected ? '' : 'hidden lg:flex lg:items-center lg:justify-center'}`}>
            {!selected ? (
              <p className="text-sm text-gray-400">Select a lead to view details.</p>
            ) : (
              <div>
                {/* Mobile back */}
                <button onClick={() => setSelectedId(null)} className="lg:hidden flex items-center gap-1 text-xs text-gray-500 mb-4">
                  <ChevronLeft size={14} /> Back to list
                </button>

                <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                  <div>
                    <h2 className="font-bold text-lg text-gray-900">{selected.name}</h2>
                    <p className="text-xs text-gray-400">{fmtDate(selected.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select value={selected.status} onChange={e => updateLead(selected.id, { status: e.target.value })}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-teal-500 outline-none">
                      {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <button onClick={() => deleteLead(selected.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex gap-2 my-4 flex-wrap">
                  {selected.email && (
                    <a href={`mailto:${selected.email}`}
                      className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold transition">
                      <Mail size={12} /> Email
                    </a>
                  )}
                  {selected.phone && (
                    <>
                      <a href={`tel:${selected.phone}`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition">
                        <Phone size={12} /> Call
                      </a>
                      <a href={`sms:${selected.phone}`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold transition">
                        <MessageSquare size={12} /> Text
                      </a>
                    </>
                  )}
                  <Link href={`/sites/${selected.slug}`} target="_blank"
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold transition">
                    <ExternalLink size={12} /> View site
                  </Link>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm mb-5">
                  <DetailRow icon={<Mail size={12} />}      label="Email"            value={selected.email} />
                  <DetailRow icon={<Phone size={12} />}     label="Phone"            value={selected.phone} />
                  <DetailRow                                 label="Service interest" value={selected.service_interest} />
                  <DetailRow                                 label="Preferred contact" value={selected.preferred_contact ? selected.preferred_contact.charAt(0).toUpperCase() + selected.preferred_contact.slice(1) : null} />
                  <DetailRow icon={<Calendar size={12} />}  label="Best time"        value={selected.preferred_time} />
                  <DetailRow icon={<DollarSign size={12} />} label="Budget"          value={selected.budget_range} />
                  <DetailRow icon={<MapPin size={12} />}    label="Project location"
                    value={[selected.project_address, selected.project_city, selected.project_zip].filter(Boolean).join(', ') || null} />
                </div>

                {selected.message && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Message</p>
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selected.message}</div>
                  </div>
                )}

                {/* Notes (contractor-only) */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Internal notes</p>
                  <textarea
                    key={selected.id}
                    defaultValue={selected.notes || ''}
                    placeholder="Add private notes about this lead..."
                    rows={3}
                    onBlur={async e => {
                      const next = e.target.value
                      if (next === (selected.notes || '')) return
                      setSavingNote(true)
                      await updateLead(selected.id, { notes: next })
                      setSavingNote(false)
                    }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">{savingNote ? 'Saving…' : 'Notes save automatically when you click away.'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5 flex items-center gap-1">{icon}{label}</p>
      <p className="text-gray-800">{value}</p>
    </div>
  )
}
