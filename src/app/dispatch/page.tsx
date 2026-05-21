'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Users, Plus, X, MapPin,
  Trash2, UserCheck, AlertCircle, FileText
} from 'lucide-react'
import Link from 'next/link'
import Breadcrumbs from '../../components/Breadcrumbs'
import { supabase } from '../../lib/supabase-client'
import { markJobsChanged } from '../../lib/data-events'

type ViewType = 'day' | 'week' | 'month'
type JobStatus = 'pending' | 'assigned' | 'in_progress' | 'completed'

interface Technician {
  id: string
  name: string
  email: string | null
  phone: string | null
  availability_days: string[]
  max_hours_per_day: number
  is_active: boolean
}

interface Job {
  id: string
  title: string
  description: string | null
  trade: string | null
  status: JobStatus | null
  priority: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  estimated_duration: string | null
  estimated_value: number | null
  site_address: string | null
  technician_id: string | null
  client_id: string | null
  technicians?: { name: string } | null
  clients?: { first_name: string; last_name: string; phone: string | null } | null
}

const STATUS_COLORS: Record<JobStatus, { bg: string; border: string; text: string; dot: string; label: string }> = {
  pending:     { bg: 'bg-yellow-50',  border: 'border-yellow-300',  text: 'text-yellow-800',  dot: 'bg-yellow-400',  label: 'Pending' },
  assigned:    { bg: 'bg-blue-50',    border: 'border-blue-300',    text: 'text-blue-800',    dot: 'bg-blue-500',    label: 'Assigned' },
  in_progress: { bg: 'bg-orange-50',  border: 'border-orange-300',  text: 'text-orange-800',  dot: 'bg-orange-500',  label: 'In Progress' },
  completed:   { bg: 'bg-green-50',   border: 'border-green-300',   text: 'text-green-800',   dot: 'bg-green-500',   label: 'Completed' },
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 7 AM - 7 PM
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatHour(h: number): string {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h > 12 ? `${h - 12} PM` : `${h} AM`
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function fmtDate(date: Date, opts?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DispatchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    }>
      <Dispatch />
    </Suspense>
  )
}

function Dispatch() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const scheduleJobId = searchParams.get('schedule')

  const [view, setView] = useState<ViewType>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all')
  const [selectedTechId, setSelectedTechId] = useState<string>('all')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showAddTech, setShowAddTech] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const [techRes, jobRes] = await Promise.all([
      supabase
        .from('technicians')
        .select('*')
        .eq('contractor_id', session.user.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('jobs')
        .select(`
          id, title, description, trade, status, priority,
          scheduled_start, scheduled_end, estimated_duration, estimated_value,
          site_address, technician_id, client_id,
          technicians (name),
          clients (first_name, last_name, phone)
        `)
        .eq('contractor_id', session.user.id)
        .not('scheduled_start', 'is', null)
        .order('scheduled_start'),
    ])

    if (techRes.data) setTechnicians(techRes.data)
    if (jobRes.data) setJobs(jobRes.data as unknown as Job[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // If a ?schedule=<jobId> param is present (e.g. arriving from the New Job
  // success screen), fetch that specific job — it may not yet have a
  // scheduled_start, so it won't appear in the main jobs query — and open
  // it in the modal so the user can pick a time and technician.
  useEffect(() => {
    if (!scheduleJobId) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id, title, description, trade, status, priority,
          scheduled_start, scheduled_end, estimated_duration, estimated_value,
          site_address, technician_id, client_id,
          technicians (name),
          clients (first_name, last_name, phone)
        `)
        .eq('id', scheduleJobId)
        .maybeSingle()
      if (cancelled || error || !data) return
      setSelectedJob(data as unknown as Job)
      // Drop the query param so a refresh doesn't re-open the modal
      router.replace('/dispatch')
    })()
    return () => { cancelled = true }
  }, [scheduleJobId, router])

  // Filter jobs
  const filteredJobs = jobs.filter(j => {
    if (statusFilter !== 'all' && j.status !== statusFilter) return false
    if (selectedTechId !== 'all' && j.technician_id !== selectedTechId) return false
    return true
  })

  // ── Date navigation
  const navigatePrev = () => {
    const d = new Date(currentDate)
    if (view === 'day') d.setDate(d.getDate() - 1)
    else if (view === 'week') d.setDate(d.getDate() - 7)
    else d.setMonth(d.getMonth() - 1)
    setCurrentDate(d)
  }
  const navigateNext = () => {
    const d = new Date(currentDate)
    if (view === 'day') d.setDate(d.getDate() + 1)
    else if (view === 'week') d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
    setCurrentDate(d)
  }
  const navigateToday = () => setCurrentDate(new Date())

  // ── Date label
  const dateLabel = (() => {
    if (view === 'day') return fmtDate(currentDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    if (view === 'week') {
      const start = startOfWeek(currentDate)
      const end = addDays(start, 6)
      return `${fmtDate(start, { month: 'short', day: 'numeric' })} – ${fmtDate(end, { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  })()

  // ── Update job
  const updateJob = async (jobId: string, updates: Partial<Job>) => {
    const { error } = await supabase.from('jobs').update(updates).eq('id', jobId)
    if (error) {
      alert(`Couldn't update job: ${error.message}`)
      return
    }
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j))
    if (selectedJob?.id === jobId) setSelectedJob(prev => prev ? { ...prev, ...updates } : null)
    markJobsChanged()
  }

  const deleteJob = async (jobId: string) => {
    if (!confirm('Delete this job? This cannot be undone.')) return
    const { error } = await supabase.from('jobs').delete().eq('id', jobId)
    if (error) {
      alert(`Couldn't delete job: ${error.message}`)
      return
    }
    setJobs(prev => prev.filter(j => j.id !== jobId))
    setSelectedJob(null)
    markJobsChanged()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Dispatch', href: '/dispatch' }]} />

      <div className="max-w-7xl mx-auto p-4 md:p-6 pt-14 md:pt-6">
        {/* Header */}
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Operations</p>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dispatch Board</h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule, assign, and track jobs across your team.</p>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-col md:flex-row md:items-center md:flex-wrap gap-3">
          {/* Row 1 on mobile: view + date nav */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex bg-gray-100 rounded-xl p-0.5">
              {(['day', 'week', 'month'] as ViewType[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 md:px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                    view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {v}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 md:ml-auto">
              <button onClick={navigatePrev} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Previous"><ChevronLeft size={16} /></button>
              <button onClick={navigateToday} className="px-2 md:px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-gray-100 text-gray-700">Today</button>
              <button onClick={navigateNext} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Next"><ChevronRight size={16} /></button>
            </div>
            <span className="text-sm font-bold text-gray-800 truncate">{dateLabel}</span>
          </div>

          {/* Row 2 on mobile: filters + actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | JobStatus)}
              className="flex-1 min-w-0 md:flex-none text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select value={selectedTechId} onChange={e => setSelectedTechId(e.target.value)}
              className="flex-1 min-w-0 md:flex-none text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
              <option value="all">All Technicians</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <button onClick={() => setShowAddTech(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition whitespace-nowrap">
              <UserCheck size={13} /> <span className="hidden sm:inline">Add Tech</span>
            </button>
            <Link href="/new-job"
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition whitespace-nowrap">
              <Plus size={13} /> New Job
            </Link>
          </div>
        </div>

        {/* Mobile hint that calendars scroll horizontally */}
        <p className="md:hidden text-[11px] text-gray-400 mb-2 px-1">Tip: swipe horizontally to see more.</p>

        {/* Status legend */}
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500 flex-wrap">
          {(Object.entries(STATUS_COLORS) as [JobStatus, typeof STATUS_COLORS[JobStatus]][]).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${v.dot}`} />
              <span>{v.label}</span>
            </div>
          ))}
        </div>

        {/* Empty states */}
        {!loading && technicians.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-12 h-12 mx-auto bg-teal-50 rounded-xl flex items-center justify-center mb-3">
              <Users size={20} className="text-teal-600" />
            </div>
            <p className="text-base font-bold text-gray-900 mb-1">No technicians yet</p>
            <p className="text-sm text-gray-500 mb-4">Add your first technician to start assigning jobs.</p>
            <button onClick={() => setShowAddTech(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold transition">
              <Plus size={14} /> Add Technician
            </button>
          </div>
        )}

        {/* Calendar views */}
        {!loading && technicians.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {view === 'day' && <DayView date={currentDate} technicians={technicians} jobs={filteredJobs} onJobClick={setSelectedJob} />}
            {view === 'week' && <WeekView date={currentDate} technicians={technicians} jobs={filteredJobs} selectedTechId={selectedTechId} onJobClick={setSelectedJob} />}
            {view === 'month' && <MonthView date={currentDate} jobs={filteredJobs} onJobClick={setSelectedJob} onDayClick={(d) => { setCurrentDate(d); setView('day') }} />}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Job detail modal */}
      {selectedJob && (
        <JobModal
          job={selectedJob}
          technicians={technicians}
          onClose={() => setSelectedJob(null)}
          onUpdate={updateJob}
          onDelete={deleteJob}
        />
      )}

      {/* Add technician modal */}
      {showAddTech && (
        <AddTechnicianModal
          onClose={() => setShowAddTech(false)}
          onAdded={() => { setShowAddTech(false); fetchData() }}
        />
      )}
    </div>
  )
}

/* ── DAY VIEW ───────────────────────────────────────────────────────── */
function DayView({ date, technicians, jobs, onJobClick }: {
  date: Date; technicians: Technician[]; jobs: Job[]; onJobClick: (j: Job) => void
}) {
  const dayJobs = jobs.filter(j => j.scheduled_start && isSameDay(new Date(j.scheduled_start), date))
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header row: technicians */}
        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="w-16 shrink-0 border-r border-gray-100" />
          {technicians.map(tech => {
            const isAvailableToday = tech.availability_days.includes(dayName)
            return (
              <div key={tech.id} className="flex-1 min-w-[160px] px-3 py-3 border-r border-gray-100 last:border-r-0">
                <p className="text-sm font-bold text-gray-900 truncate">{tech.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isAvailableToday ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <p className="text-[10px] text-gray-400">
                    {isAvailableToday ? `${tech.max_hours_per_day}h capacity` : 'Off today'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Body: hours × technicians */}
        <div className="flex">
          {/* Time column */}
          <div className="w-16 shrink-0 border-r border-gray-100">
            {HOURS.map(h => (
              <div key={h} className="h-16 border-b border-gray-100 flex items-start justify-end pr-2 pt-1">
                <span className="text-[10px] font-semibold text-gray-400">{formatHour(h)}</span>
              </div>
            ))}
          </div>

          {/* Tech columns */}
          {technicians.map(tech => {
            const techJobs = dayJobs.filter(j => j.technician_id === tech.id)
            return (
              <div key={tech.id} className="flex-1 min-w-[160px] border-r border-gray-100 last:border-r-0 relative">
                {HOURS.map(h => (
                  <div key={h} className="h-16 border-b border-gray-100 hover:bg-teal-50/30 transition" />
                ))}
                {techJobs.map(job => <JobBlock key={job.id} job={job} onClick={() => onJobClick(job)} />)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── WEEK VIEW ──────────────────────────────────────────────────────── */
function WeekView({ date, technicians, jobs, selectedTechId, onJobClick }: {
  date: Date; technicians: Technician[]; jobs: Job[]; selectedTechId: string; onJobClick: (j: Job) => void
}) {
  const weekStart = startOfWeek(date)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const techJobs = jobs.filter(j => {
    if (!j.scheduled_start) return false
    if (selectedTechId !== 'all' && j.technician_id !== selectedTechId) return false
    return true
  })

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        {/* Header row: days */}
        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="w-16 shrink-0 border-r border-gray-100" />
          {weekDays.map(d => {
            const isToday = isSameDay(d, new Date())
            return (
              <div key={d.toISOString()} className="flex-1 px-3 py-3 border-r border-gray-100 last:border-r-0 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {d.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className={`text-base font-bold mt-0.5 ${isToday ? 'text-teal-600' : 'text-gray-900'}`}>
                  {d.getDate()}
                </p>
              </div>
            )
          })}
        </div>

        {/* Body: hours × days */}
        <div className="flex">
          <div className="w-16 shrink-0 border-r border-gray-100">
            {HOURS.map(h => (
              <div key={h} className="h-16 border-b border-gray-100 flex items-start justify-end pr-2 pt-1">
                <span className="text-[10px] font-semibold text-gray-400">{formatHour(h)}</span>
              </div>
            ))}
          </div>

          {weekDays.map(d => {
            const dayJobs = techJobs.filter(j => j.scheduled_start && isSameDay(new Date(j.scheduled_start), d))
            return (
              <div key={d.toISOString()} className="flex-1 border-r border-gray-100 last:border-r-0 relative">
                {HOURS.map(h => (
                  <div key={h} className="h-16 border-b border-gray-100 hover:bg-teal-50/30 transition" />
                ))}
                {dayJobs.map(job => <JobBlock key={job.id} job={job} onClick={() => onJobClick(job)} />)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── MONTH VIEW ─────────────────────────────────────────────────────── */
function MonthView({ date, jobs, onJobClick, onDayClick }: {
  date: Date; jobs: Job[]; onJobClick: (j: Job) => void; onDayClick: (d: Date) => void
}) {
  const monthStart = startOfMonth(date)
  const calendarStart = startOfWeek(monthStart)
  const days = Array.from({ length: 42 }, (_, i) => addDays(calendarStart, i))
  const today = new Date()

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const isCurrentMonth = d.getMonth() === date.getMonth()
          const isToday = isSameDay(d, today)
          const dayJobs = jobs.filter(j => j.scheduled_start && isSameDay(new Date(j.scheduled_start), d))

          return (
            <div key={i}
              onClick={() => onDayClick(d)}
              className={`min-h-[100px] p-2 border-r border-b border-gray-100 last:border-r-0 cursor-pointer hover:bg-teal-50/40 transition ${
                !isCurrentMonth ? 'bg-gray-50/50' : ''
              }`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${
                  isToday ? 'bg-teal-600 text-white w-5 h-5 rounded-full flex items-center justify-center'
                  : isCurrentMonth ? 'text-gray-800' : 'text-gray-300'
                }`}>
                  {d.getDate()}
                </span>
                {dayJobs.length > 0 && (
                  <span className="text-[9px] font-bold text-gray-400">{dayJobs.length}</span>
                )}
              </div>
              <div className="space-y-1">
                {dayJobs.slice(0, 3).map(job => {
                  const status = (job.status || 'pending') as JobStatus
                  const colors = STATUS_COLORS[status]
                  return (
                    <div key={job.id}
                      onClick={(e) => { e.stopPropagation(); onJobClick(job) }}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold truncate ${colors.bg} ${colors.text} border ${colors.border} hover:opacity-80`}>
                      {job.title}
                    </div>
                  )
                })}
                {dayJobs.length > 3 && (
                  <div className="text-[9px] text-gray-400 font-medium">+{dayJobs.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── JOB BLOCK ──────────────────────────────────────────────────────── */
function JobBlock({ job, onClick }: { job: Job; onClick: () => void }) {
  if (!job.scheduled_start) return null
  const start = new Date(job.scheduled_start)
  const end = job.scheduled_end ? new Date(job.scheduled_end) : new Date(start.getTime() + 60 * 60 * 1000)
  const startHour = start.getHours() + start.getMinutes() / 60
  const endHour = end.getHours() + end.getMinutes() / 60
  // If end is on a different day, cap at end of day for display
  const displayEnd = endHour > 19 || end.getDate() !== start.getDate() ? 19 : endHour
  const top = (Math.max(7, startHour) - 7) * 64
  const height = Math.max(24, (displayEnd - Math.max(7, startHour)) * 64 - 4)

  if (startHour >= 19) return null // Outside view

  const status = (job.status || 'pending') as JobStatus
  const colors = STATUS_COLORS[status]
  const customerName = job.clients ? `${job.clients.first_name} ${job.clients.last_name}` : null

  return (
    <button onClick={onClick}
      style={{ top: `${top}px`, height: `${height}px` }}
      className={`absolute inset-x-1 rounded-lg border px-2 py-1.5 z-10 overflow-hidden text-left hover:shadow-md transition ${colors.bg} ${colors.border}`}>
      <p className={`text-[11px] font-bold truncate ${colors.text}`}>{job.title}</p>
      {customerName && <p className="text-[9px] opacity-70 truncate">{customerName}</p>}
      {job.site_address && (
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin size={8} className="opacity-60 shrink-0" />
          <p className="text-[9px] opacity-60 truncate">{job.site_address}</p>
        </div>
      )}
    </button>
  )
}

/* ── JOB MODAL ──────────────────────────────────────────────────────── */
function JobModal({ job, technicians, onClose, onUpdate, onDelete }: {
  job: Job
  technicians: Technician[]
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Job>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    title: job.title,
    status: (job.status || 'pending') as JobStatus,
    technician_id: job.technician_id || '',
    scheduled_start: job.scheduled_start ? job.scheduled_start.slice(0, 16) : '',
    site_address: job.site_address || '',
    description: job.description || '',
  })

  const handleSave = async () => {
    await onUpdate(job.id, {
      title: form.title,
      status: form.status,
      technician_id: form.technician_id || null,
      scheduled_start: form.scheduled_start ? new Date(form.scheduled_start).toISOString() : null,
      site_address: form.site_address || null,
      description: form.description || null,
    })
    setEditing(false)
  }

  const status = (job.status || 'pending') as JobStatus
  const colors = STATUS_COLORS[status]
  const start = job.scheduled_start ? new Date(job.scheduled_start) : null
  const customerName = job.clients ? `${job.clients.first_name} ${job.clients.last_name}` : 'No customer'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-w-lg w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between ${colors.bg}`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>{colors.label}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition" aria-label="Close"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {!editing ? (
            <>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">{job.title}</h2>
                {job.trade && <p className="text-sm text-gray-500 mt-0.5">{job.trade}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow label="Customer" value={customerName} />
                <InfoRow label="Phone" value={job.clients?.phone || '—'} />
                <InfoRow label="Technician" value={job.technicians?.name || 'Unassigned'} />
                {start && <InfoRow label="Date" value={start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />}
                {start && <InfoRow label="Time" value={start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} />}
                <InfoRow label="Duration" value={job.estimated_duration || '—'} />
                <InfoRow label="Value" value={job.estimated_value ? `$${Number(job.estimated_value).toLocaleString()}` : '—'} />
              </div>

              {job.site_address && (
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                  <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-700">{job.site_address}</p>
                </div>
              )}

              {job.description && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
                </div>
              )}

              {/* Quick status update */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Quick Status Update</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(STATUS_COLORS) as [JobStatus, typeof STATUS_COLORS[JobStatus]][]).map(([key, val]) => (
                    <button key={key}
                      onClick={() => onUpdate(job.id, { status: key })}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                        status === key ? `${val.bg} ${val.text} ${val.border}` : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}>
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <Field label="Title">
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as JobStatus })}
                  className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                  {Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Technician">
                <select value={form.technician_id} onChange={e => setForm({ ...form, technician_id: e.target.value })}
                  className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                  <option value="">Unassigned</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="Scheduled Start">
                <input type="datetime-local" value={form.scheduled_start} onChange={e => setForm({ ...form, scheduled_start: e.target.value })}
                  className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
              </Field>
              <Field label="Site Address">
                <input value={form.site_address} onChange={e => setForm({ ...form, site_address: e.target.value })}
                  className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
              </Field>
              <Field label="Notes">
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                  className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 resize-none" />
              </Field>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex items-center gap-2 flex-wrap">
          <button onClick={() => onDelete(job.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition">
            <Trash2 size={13} /> Delete
          </button>
          <div className="flex-1" />
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold">Save Changes</button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="px-3 sm:px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Close</button>
              <button onClick={() => setEditing(true)} className="px-3 sm:px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50">Edit Job</button>
              <Link href={`/dashboard/invoices/new?job_id=${job.id}`}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition whitespace-nowrap">
                <FileText size={13} /> Create Invoice
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value}</p>
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

/* ── ADD TECHNICIAN MODAL ───────────────────────────────────────────── */
function AddTechnicianModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [days, setDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [maxHours, setMaxHours] = useState(8)
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

    const { error: err } = await supabase.from('technicians').insert({
      contractor_id: session.user.id,
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      availability_days: days,
      max_hours_per_day: maxHours,
      is_active: true,
    })

    if (err) { setError(err.message); setSaving(false); return }
    onAdded()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-w-md w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-teal-600" />
            <h2 className="text-lg font-bold text-gray-900">Add Technician</h2>
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

          <Field label="Name *">
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mike Johnson"
              className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mike@example.com"
                className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </Field>
            <Field label="Phone">
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555"
                className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
            </Field>
          </div>

          <Field label="Working Days">
            <div className="flex gap-1.5 flex-wrap">
              {DAY_NAMES.slice(1).concat([DAY_NAMES[0]]).map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    days.includes(d) ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Max Hours per Day">
            <select value={maxHours} onChange={e => setMaxHours(Number(e.target.value))}
              className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
              <option value="4">4 hours</option>
              <option value="6">6 hours</option>
              <option value="8">8 hours</option>
              <option value="10">10 hours</option>
              <option value="12">12 hours</option>
            </select>
          </Field>
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold">
            {saving ? 'Saving...' : 'Add Technician'}
          </button>
        </div>
      </div>
    </div>
  )
}
