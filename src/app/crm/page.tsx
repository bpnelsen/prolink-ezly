'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Users, KanbanSquare, ClipboardCheck, AlertCircle,
  Sparkles, CheckCircle2, Clock, Mail, Phone, Calendar, MessageSquare,
  ChevronRight, ArrowRight, StickyNote, Activity as ActivityIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { crmAPI, formatCurrencyCents } from '@/lib/crm-client'
import type { CRMStats, PipelineStage, Activity, ActivityKind } from '@/lib/crm-types'

const ACTIVITY_ICON: Record<ActivityKind, LucideIcon> = {
  email: Mail,
  call: Phone,
  sms: MessageSquare,
  dm: MessageSquare,
  task: CheckCircle2,
  meeting: Calendar,
  note: StickyNote,
}

const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  email: 'Email',
  call: 'Call',
  sms: 'SMS',
  dm: 'Direct message',
  task: 'Task',
  meeting: 'Meeting',
  note: 'Note',
}

const ACTIVITY_TONE: Record<ActivityKind, string> = {
  email: 'bg-violet-100 text-violet-600',
  call: 'bg-emerald-100 text-emerald-600',
  sms: 'bg-sky-100 text-sky-600',
  dm: 'bg-sky-100 text-sky-600',
  task: 'bg-amber-100 text-amber-600',
  meeting: 'bg-rose-100 text-rose-600',
  note: 'bg-gray-100 text-gray-600',
}

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

export default function CRMDashboard() {
  const [stats, setStats] = useState<CRMStats | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      crmAPI.stats(),
      crmAPI.stages(),
      crmAPI.activities.list({ limit: 6 }),
    ])
      .then(([s, st, a]) => {
        setStats(s)
        setStages(st.stages)
        setActivities(a.items)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  const derived = useMemo(() => {
    if (!stats) return null
    const wonStat = stats.by_stage.won || { count: 0, value_cents: 0 }
    const lostStat = stats.by_stage.lost || { count: 0, value_cents: 0 }
    const openStageEntries = Object.entries(stats.by_stage).filter(([k]) => k !== 'won' && k !== 'lost')
    const pipelineValue = openStageEntries.reduce((sum, [, v]) => sum + v.value_cents, 0)
    const openDealCount = openStageEntries.reduce((sum, [, v]) => sum + v.count, 0)
    const closedDeals = wonStat.count + lostStat.count
    const winRate = closedDeals > 0 ? Math.round((wonStat.count / closedDeals) * 100) : 0
    const total = stats.total_contractors || 1
    const engaged = (stats.by_contact_status.contacted || 0) + (stats.by_contact_status.qualified || 0)
    const engagementPct = Math.round((engaged / total) * 100)
    const overduePct = stats.open_tasks > 0 ? Math.round((stats.overdue_tasks / stats.open_tasks) * 100) : 0
    const newContacts = stats.by_contact_status.new || 0
    const qualified = stats.by_contact_status.qualified || 0
    const totalValueCents = pipelineValue + wonStat.value_cents
    const pipelineShare = totalValueCents > 0 ? Math.round((pipelineValue / totalValueCents) * 100) : 0
    return {
      wonStat, lostStat, pipelineValue, openDealCount, winRate,
      engagementPct, overduePct, newContacts, qualified, pipelineShare,
    }
  }, [stats])

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">
        Failed to load dashboard: {error}
      </div>
    )
  }

  if (!stats || !derived) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  const overdueLabel = `${stats.overdue_tasks} ${stats.overdue_tasks === 1 ? 'overdue task' : 'overdue tasks'}`

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting()}, Prolink</h1>
          <p className="text-sm text-gray-500 mt-1">
            Prolink has handled <span className="font-bold text-gray-900">{stats.recent_activity_count_7d} activities</span> this week. Here&apos;s today at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            All systems normal
          </span>
          <Link
            href="/crm/activities"
            className="inline-flex items-center gap-2 bg-[#0f0a1f] hover:bg-[#1a1233] text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm"
          >
            <Sparkles size={13} className="text-violet-300" />
            {overdueLabel}
          </Link>
        </div>
      </div>

      {/* Hero AI banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2a1a52] via-[#231346] to-[#1a0e38] p-6 shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl"
        />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex items-center gap-5 lg:flex-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-900/40 shrink-0">
              <Sparkles size={26} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Outreach engine · live
              </div>
              <h2 className="text-white font-bold text-lg mt-2">
                Tracking {stats.total_contractors.toLocaleString()} contractors across the pipeline
              </h2>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="bg-white/10 border border-white/10 rounded-full px-3 py-1 text-xs text-white/80">
                  {derived.openDealCount} in outreach
                </span>
                <span className="bg-white/10 border border-white/10 rounded-full px-3 py-1 text-xs text-white/80">
                  {derived.qualified} qualified
                </span>
                <span className="bg-white/10 border border-white/10 rounded-full px-3 py-1 text-xs text-white/80">
                  {derived.winRate}% win rate
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:w-[460px]">
            <HeroStat
              label="Activities 7d"
              value={stats.recent_activity_count_7d.toLocaleString()}
              bars={[3, 5, 4, 6, 4, 7, 6, 8]}
            />
            <HeroStat
              label="Open tasks"
              value={stats.open_tasks.toLocaleString()}
              bars={[2, 4, 3, 5, 6, 5, 7, 6]}
            />
            <HeroStat
              label="Won lifetime"
              value={formatCurrencyCents(derived.wonStat.value_cents)}
              bars={[4, 5, 6, 5, 7, 6, 8, 9]}
            />
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users size={16} />}
          label="Total contractors"
          value={stats.total_contractors.toLocaleString()}
          sub={`${derived.newContacts.toLocaleString()} new · ${derived.qualified.toLocaleString()} qualified`}
          progress={derived.engagementPct}
          progressLabel="Engaged"
          progressTone="bg-violet-500"
          href="/crm/contractors"
        />
        <KpiCard
          icon={<KanbanSquare size={16} />}
          label="Open pipeline"
          value={formatCurrencyCents(derived.pipelineValue)}
          sub={`${derived.openDealCount} active deal${derived.openDealCount === 1 ? '' : 's'}`}
          progress={derived.pipelineShare}
          progressLabel="Of total value"
          progressTone="bg-emerald-500"
          href="/crm/pipeline"
        />
        <KpiCard
          icon={<ClipboardCheck size={16} />}
          label="Open tasks"
          value={stats.open_tasks.toLocaleString()}
          sub={`${stats.recent_activity_count_7d.toLocaleString()} activities · 7d`}
          progress={Math.min(100, Math.round((stats.open_tasks / Math.max(stats.total_contractors, 1)) * 100))}
          progressLabel="Per contractor"
          progressTone="bg-amber-500"
          href="/crm/activities"
        />
        <KpiCard
          icon={<AlertCircle size={16} />}
          label="Overdue"
          value={stats.overdue_tasks.toLocaleString()}
          sub={stats.overdue_tasks > 0 ? 'Action needed' : 'All caught up'}
          progress={derived.overduePct}
          progressLabel="Of open tasks"
          progressTone={stats.overdue_tasks > 0 ? 'bg-rose-500' : 'bg-emerald-500'}
          tone={stats.overdue_tasks > 0 ? 'warn' : undefined}
          href="/crm/activities"
        />
      </div>

      {/* Main 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity feed */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="font-bold text-gray-900">Recent activity</h2>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live · last 7 days
              </p>
            </div>
            <Link
              href="/crm/activities"
              className="text-xs font-bold text-violet-700 hover:text-violet-800 border border-gray-200 hover:border-violet-300 rounded-full px-3 py-1.5"
            >
              View all
            </Link>
          </div>

          {activities.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No activity logged yet. Log a call or send an email to get started.
            </p>
          ) : (
            <ul className="space-y-4">
              {activities.map((a) => {
                const Icon = ACTIVITY_ICON[a.kind] || ActivityIcon
                const tone = ACTIVITY_TONE[a.kind] || 'bg-gray-100 text-gray-600'
                const dateStr = a.completed_at || a.due_at || a.created_at
                return (
                  <li key={a.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {a.subject || ACTIVITY_LABEL[a.kind] || 'Activity'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <Clock size={10} />
                        {ACTIVITY_LABEL[a.kind] || a.kind}
                        {dateStr ? ` · ${timeAgo(dateStr)}` : ''}
                        {a.completed ? ' · Completed' : ''}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Pipeline by stage */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="font-bold text-gray-900">Pipeline by stage</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {derived.openDealCount} open · {formatCurrencyCents(derived.pipelineValue)} value
              </p>
            </div>
            <Link
              href="/crm/pipeline"
              className="text-xs font-bold text-violet-700 hover:text-violet-800 flex items-center gap-1"
            >
              Open board <ArrowRight size={12} />
            </Link>
          </div>

          {stages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No stages configured.</p>
          ) : (
            <ul className="space-y-3">
              {stages.map((s) => {
                const v = stats.by_stage[s.key] || { count: 0, value_cents: 0 }
                const max = Math.max(...stages.map((x) => (stats.by_stage[x.key]?.count || 0)), 1)
                const pct = Math.round((v.count / max) * 100)
                const isWon = s.is_won
                const isLost = s.is_lost
                const barTone = isWon ? 'bg-emerald-500' : isLost ? 'bg-gray-300' : 'bg-violet-500'
                return (
                  <li key={s.key}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-gray-800 font-semibold">{s.label}</span>
                      <span className="text-xs text-gray-500 tabular-nums">
                        {v.count} · {formatCurrencyCents(v.value_cents)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${barTone} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Contact status */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-bold text-gray-900">Contact status</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Lifecycle breakdown · {stats.total_contractors.toLocaleString()} contractors
            </p>
          </div>
          <Link
            href="/crm/contractors"
            className="text-xs font-bold text-violet-700 hover:text-violet-800 flex items-center gap-1"
          >
            View all <ChevronRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(stats.by_contact_status)
            .sort((a, b) => b[1] - a[1])
            .map(([key, count]) => (
              <StatusPill key={key} statusKey={key} count={count} total={stats.total_contractors} />
            ))}
        </div>
      </div>
    </div>
  )
}

function HeroStat({ label, value, bars }: { label: string; value: string; bars: number[] }) {
  const max = Math.max(...bars, 1)
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm">
      <p className="text-[10px] uppercase font-bold tracking-widest text-white/50">{label}</p>
      <div className="flex items-end justify-between gap-2 mt-1.5">
        <p className="text-xl font-bold text-white truncate">{value}</p>
        <div className="flex items-end gap-0.5 h-7 shrink-0" aria-hidden>
          {bars.map((b, i) => (
            <span
              key={i}
              className="w-1 rounded-sm bg-gradient-to-t from-violet-400/40 to-violet-200/90"
              style={{ height: `${(b / max) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  icon, label, value, sub, progress, progressLabel, progressTone, href, tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  progress: number
  progressLabel: string
  progressTone: string
  href: string
  tone?: 'warn'
}) {
  const ringCls = tone === 'warn' ? 'bg-rose-50 text-rose-600' : 'bg-violet-50 text-violet-600'
  return (
    <Link
      href={href}
      className="group bg-white border border-gray-200 hover:border-violet-300 rounded-2xl p-5 shadow-sm hover:shadow transition flex flex-col"
    >
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ringCls}`}>
          {icon}
        </div>
        <ChevronRight size={14} className="text-gray-300 group-hover:text-violet-500 transition" />
      </div>
      <p className="text-xs font-semibold text-gray-500 mt-4">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
      <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>
      <div className="mt-4">
        <div className="flex items-center justify-between text-[10px] font-semibold text-gray-500 mb-1">
          <span>{progressLabel}</span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressTone} rounded-full`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>
    </Link>
  )
}

const STATUS_TONE: Record<string, { dot: string; chip: string }> = {
  new: { dot: 'bg-sky-500', chip: 'text-sky-700' },
  contacted: { dot: 'bg-violet-500', chip: 'text-violet-700' },
  qualified: { dot: 'bg-emerald-500', chip: 'text-emerald-700' },
  unqualified: { dot: 'bg-gray-400', chip: 'text-gray-600' },
  do_not_contact: { dot: 'bg-rose-500', chip: 'text-rose-700' },
}

function StatusPill({ statusKey, count, total }: { statusKey: string; count: number; total: number }) {
  const tone = STATUS_TONE[statusKey] || { dot: 'bg-gray-400', chip: 'text-gray-600' }
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const label = statusKey.replace(/_/g, ' ')
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
        <p className={`text-[10px] uppercase font-bold tracking-wider truncate ${tone.chip}`}>{label}</p>
      </div>
      <p className="text-xl font-bold text-gray-900 mt-2 tabular-nums">{count.toLocaleString()}</p>
      <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">{pct}% of total</p>
    </div>
  )
}
