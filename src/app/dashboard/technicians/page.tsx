'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Users, Plus, X, AlertCircle, Edit3, Power, Trash2, Mail, Phone,
  Calendar, Briefcase, DollarSign, TrendingUp, Search, Filter,
  CheckCircle2, MoreVertical
} from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import { supabase } from '../../../lib/supabase-client'

interface Technician {
  id: string
  name: string
  email: string | null
  phone: string | null
  availability_days: string[]
  max_hours_per_day: number
  is_active: boolean
  created_at: string
}

interface JobMetric {
  technician_id: string | null
  status: string | null
  estimated_value: number | null
  scheduled_start: string | null
}

interface TechMetrics {
  activeJobs: number
  completedThisMonth: number
  completedTotal: number
  revenueThisMonth: number
  revenueTotal: number
  utilization: number
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function startOfMonth(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [jobs, setJobs] = useState<JobMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [editingTech, setEditingTech] = useState<Technician | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const [techRes, jobRes] = await Promise.all([
      supabase
        .from('technicians')
        .select('*')
        .eq('contractor_id', session.user.id)
        .order('name'),
      supabase
        .from('jobs')
        .select('technician_id, status, estimated_value, scheduled_start')
        .eq('contractor_id', session.user.id),
    ])

    if (techRes.data) setTechnicians(techRes.data)
    if (jobRes.data) setJobs(jobRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Calculate metrics for each tech
  const getMetrics = (techId: string, maxHours: number, workDays: string[]): TechMetrics => {
    const techJobs = jobs.filter(j => j.technician_id === techId)
    const monthStart = startOfMonth()
    const completed = techJobs.filter(j => j.status === 'completed')
    const completedThisMonth = completed.filter(j => j.scheduled_start && new Date(j.scheduled_start) >= monthStart)
    const active = techJobs.filter(j => j.status === 'assigned' || j.status === 'in_progress')

    const revenueTotal = completed.reduce((sum, j) => sum + (Number(j.estimated_value) || 0), 0)
    const revenueThisMonth = completedThisMonth.reduce((sum, j) => sum + (Number(j.estimated_value) || 0), 0)

    // Utilization: hours scheduled this week / max possible hours
    const weekStart = new Date()
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
    const weekJobs = techJobs.filter(j => j.scheduled_start && new Date(j.scheduled_start) >= weekStart)
    const scheduledHours = weekJobs.length * 4 // rough estimate
    const maxWeekHours = workDays.length * maxHours
    const utilization = maxWeekHours > 0 ? Math.min(100, Math.round((scheduledHours / maxWeekHours) * 100)) : 0

    return {
      activeJobs: active.length,
      completedThisMonth: completedThisMonth.length,
      completedTotal: completed.length,
      revenueThisMonth,
      revenueTotal,
      utilization,
    }
  }

  // Filtered technicians
  const filtered = technicians.filter(t => {
    if (statusFilter === 'active' && !t.is_active) return false
    if (statusFilter === 'inactive' && t.is_active) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
        !(t.email?.toLowerCase().includes(search.toLowerCase())) &&
        !(t.phone?.includes(search))) return false
    return true
  })

  // Aggregate stats
  const totalActiveTechs = technicians.filter(t => t.is_active).length
  const totalActiveJobs = jobs.filter(j => j.status === 'assigned' || j.status === 'in_progress').length
  const monthStart = startOfMonth()
  const completedMonth = jobs.filter(j => j.status === 'completed' && j.scheduled_start && new Date(j.scheduled_start) >= monthStart)
  const monthRevenue = completedMonth.reduce((sum, j) => sum + (Number(j.estimated_value) || 0), 0)

  const toggleActive = async (tech: Technician) => {
    const { error } = await supabase
      .from('technicians')
      .update({ is_active: !tech.is_active })
      .eq('id', tech.id)
    if (!error) {
      setTechnicians(prev => prev.map(t => t.id === tech.id ? { ...t, is_active: !t.is_active } : t))
    }
    setOpenMenuId(null)
  }

  const deleteTech = async (tech: Technician) => {
    if (!confirm(`Delete ${tech.name}? Their assigned jobs will be unassigned. This cannot be undone.`)) return
    const { error } = await supabase.from('technicians').delete().eq('id', tech.id)
    if (!error) {
      setTechnicians(prev => prev.filter(t => t.id !== tech.id))
    }
    setOpenMenuId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50" onClick={() => setOpenMenuId(null)}>
      <Breadcrumbs items={[{ label: 'Team', href: '/dashboard/technicians' }]} />

      <div className="max-w-7xl mx-auto p-4 md:p-6 pt-14 md:pt-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Operations</p>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage technicians, track performance, and monitor capacity.</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition shadow-sm whitespace-nowrap">
            <Plus size={14} /> Add Technician
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            icon={<Users size={18} className="text-teal-600" />}
            label="Active Technicians"
            value={String(totalActiveTechs)}
            sub={`${technicians.length - totalActiveTechs} inactive`}
          />
          <StatCard
            icon={<Briefcase size={18} className="text-blue-600" />}
            label="Active Jobs"
            value={String(totalActiveJobs)}
            sub="Assigned + in progress"
          />
          <StatCard
            icon={<CheckCircle2 size={18} className="text-green-600" />}
            label="Completed This Month"
            value={String(completedMonth.length)}
            sub={completedMonth.length > 0 ? `${completedMonth.length} jobs done` : 'No jobs yet'}
          />
          <StatCard
            icon={<DollarSign size={18} className="text-orange-600" />}
            label="Revenue This Month"
            value={`$${monthRevenue.toLocaleString()}`}
            sub="From completed jobs"
          />
        </div>

        {/* Search + filter */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, or phone..."
              className="w-full bg-gray-50 pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
              <option value="all">All Technicians</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Technician table */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : technicians.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-12 h-12 mx-auto bg-teal-50 rounded-xl flex items-center justify-center mb-3">
              <Users size={20} className="text-teal-600" />
            </div>
            <p className="text-base font-bold text-gray-900 mb-1">No technicians yet</p>
            <p className="text-sm text-gray-500 mb-4">Add your first technician to start assigning jobs.</p>
            <button onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition">
              <Plus size={14} /> Add Your First Technician
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-sm text-gray-400">
            No technicians match your filters.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Technician</th>
                    <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden md:table-cell">Schedule</th>
                    <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Active</th>
                    <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden md:table-cell">This Month</th>
                    <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden lg:table-cell">Revenue</th>
                    <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden lg:table-cell">Utilization</th>
                    <th className="px-3 py-3 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(tech => {
                    const metrics = getMetrics(tech.id, tech.max_hours_per_day, tech.availability_days)
                    const initials = tech.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                    return (
                      <tr key={tech.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                        <td className="px-5 py-3">
                          <button onClick={() => setEditingTech(tech)} className="flex items-center gap-3 text-left w-full">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              tech.is_active ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400'
                            }`}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{tech.name}</p>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-[10px] text-gray-400 min-w-0">
                                {tech.email && (
                                  <span className="flex items-center gap-1 min-w-0">
                                    <Mail size={9} className="shrink-0" />
                                    <span className="truncate">{tech.email}</span>
                                  </span>
                                )}
                                {tech.phone && (
                                  <span className="flex items-center gap-1 min-w-0">
                                    <Phone size={9} className="shrink-0" />
                                    <span className="truncate">{tech.phone}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          {tech.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-full text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell">
                          <div className="flex items-center gap-1">
                            {ALL_DAYS.map(d => (
                              <div key={d}
                                className={`w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center ${
                                  tech.availability_days.includes(d)
                                    ? 'bg-teal-100 text-teal-700'
                                    : 'bg-gray-100 text-gray-300'
                                }`}>
                                {d[0]}
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">{tech.max_hours_per_day}h/day</p>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-sm font-bold text-gray-900">{metrics.activeJobs}</span>
                        </td>
                        <td className="px-3 py-3 text-center hidden md:table-cell">
                          <span className="text-sm font-bold text-gray-900">{metrics.completedThisMonth}</span>
                          <p className="text-[10px] text-gray-400">{metrics.completedTotal} total</p>
                        </td>
                        <td className="px-3 py-3 text-right hidden lg:table-cell">
                          <span className="text-sm font-bold text-teal-700">${metrics.revenueThisMonth.toLocaleString()}</span>
                          <p className="text-[10px] text-gray-400">${metrics.revenueTotal.toLocaleString()} total</p>
                        </td>
                        <td className="px-3 py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                              <div className={`h-full rounded-full transition-all ${
                                metrics.utilization > 90 ? 'bg-orange-500' :
                                metrics.utilization > 60 ? 'bg-teal-500' :
                                metrics.utilization > 30 ? 'bg-blue-500' : 'bg-gray-300'
                              }`} style={{ width: `${metrics.utilization}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-600 w-8 text-right">{metrics.utilization}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 relative">
                          <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === tech.id ? null : tech.id) }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                            <MoreVertical size={14} />
                          </button>
                          {openMenuId === tech.id && (
                            <div onClick={e => e.stopPropagation()}
                              className="absolute right-3 top-12 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
                              <button onClick={() => { setEditingTech(tech); setOpenMenuId(null) }}
                                className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                <Edit3 size={12} /> Edit
                              </button>
                              <button onClick={() => toggleActive(tech)}
                                className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                <Power size={12} /> {tech.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button onClick={() => deleteTech(tech)}
                                className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100">
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

      {/* Edit / Add modals */}
      {showAddModal && (
        <TechnicianModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchData() }}
        />
      )}
      {editingTech && (
        <TechnicianModal
          tech={editingTech}
          onClose={() => setEditingTech(null)}
          onSaved={() => { setEditingTech(null); fetchData() }}
        />
      )}
    </div>
  )
}

/* ── STAT CARD ──────────────────────────────────────────────────────── */
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

/* ── ADD/EDIT TECHNICIAN MODAL ──────────────────────────────────────── */
function TechnicianModal({ tech, onClose, onSaved }: {
  tech?: Technician
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!tech
  const [name, setName] = useState(tech?.name || '')
  const [email, setEmail] = useState(tech?.email || '')
  const [phone, setPhone] = useState(tech?.phone || '')
  const [days, setDays] = useState<string[]>(tech?.availability_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [maxHours, setMaxHours] = useState(tech?.max_hours_per_day || 8)
  const [isActive, setIsActive] = useState(tech?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleDay = (d: string) => {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Not logged in'); setSaving(false); return }

    const payload = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      availability_days: days,
      max_hours_per_day: maxHours,
      is_active: isActive,
    }

    const { error: err } = isEdit && tech
      ? await supabase.from('technicians').update(payload).eq('id', tech.id)
      : await supabase.from('technicians').insert({ ...payload, contractor_id: session.user.id })

    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-w-md w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-teal-600" />
            <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Technician' : 'Add Technician'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name *</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mike Johnson"
              className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mike@example.com"
                className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555"
                className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <Calendar size={12} /> Working Days
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {ALL_DAYS.map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    days.includes(d) ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <TrendingUp size={12} /> Max Hours per Day
            </label>
            <select value={maxHours} onChange={e => setMaxHours(Number(e.target.value))}
              className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
              <option value="4">4 hours</option>
              <option value="6">6 hours</option>
              <option value="8">8 hours</option>
              <option value="10">10 hours</option>
              <option value="12">12 hours</option>
            </select>
          </div>

          {isEdit && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-gray-800">Active Status</p>
                <p className="text-[10px] text-gray-400">Inactive technicians won't show in dispatch or job creation.</p>
              </div>
              <button type="button" onClick={() => setIsActive(!isActive)}
                className={`relative w-11 h-6 rounded-full transition ${isActive ? 'bg-teal-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isActive ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold">
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Technician'}
          </button>
        </div>
      </div>
    </div>
  )
}

