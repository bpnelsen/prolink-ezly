'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, KanbanSquare, ClipboardCheck, AlertCircle, TrendingUp, Zap, ArrowRight,
} from 'lucide-react'
import { crmAPI, formatCurrencyCents } from '@/lib/crm-client'
import type { CRMStats, PipelineStage } from '@/lib/crm-types'

export default function CRMDashboard() {
  const [stats, setStats] = useState<CRMStats | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([crmAPI.stats(), crmAPI.stages()])
      .then(([s, st]) => { setStats(s); setStages(st.stages) })
      .catch((e: Error) => setError(e.message))
  }, [])

  if (error) return <div className="text-sm text-rose-600">Failed to load: {error}</div>
  if (!stats) return <div className="text-sm text-gray-500">Loading dashboard…</div>

  const wonValue = stats.by_stage.won?.value_cents || 0
  const pipelineValue = Object.entries(stats.by_stage)
    .filter(([k]) => k !== 'won' && k !== 'lost')
    .reduce((sum, [, v]) => sum + v.value_cents, 0)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Snapshot of Prolink's contractor outreach pipeline.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/crm/contractors/new"
            className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm"
          >
            + Add contractor
          </Link>
          <Link
            href="/crm/import"
            className="border border-gray-200 hover:border-teal-500 text-gray-700 text-sm font-bold px-4 py-2 rounded-lg"
          >
            Import CSV
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={18} />} label="Total contractors"
          value={stats.total_contractors.toLocaleString()}
          href="/crm/contractors"
        />
        <StatCard
          icon={<KanbanSquare size={18} />} label="Open pipeline"
          value={formatCurrencyCents(pipelineValue)}
          href="/crm/pipeline"
        />
        <StatCard
          icon={<ClipboardCheck size={18} />} label="Open tasks"
          value={stats.open_tasks.toLocaleString()}
          href="/crm/activities"
        />
        <StatCard
          icon={<AlertCircle size={18} />} label="Overdue"
          value={stats.overdue_tasks.toLocaleString()}
          href="/crm/activities"
          tone={stats.overdue_tasks > 0 ? 'warn' : undefined}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={16} className="text-teal-600" /> Pipeline by stage
            </h2>
            <Link href="/crm/pipeline" className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1">
              Open board <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="space-y-2">
            {stages.map(s => {
              const v = stats.by_stage[s.key] || { count: 0, value_cents: 0 }
              return (
                <li key={s.key} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{s.label}</span>
                  <span className="text-gray-500 font-medium">
                    {v.count} · {formatCurrencyCents(v.value_cents)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Zap size={16} className="text-teal-600" /> Contact status
            </h2>
            <span className="text-xs text-gray-500">
              {stats.recent_activity_count_7d} activities · last 7d
            </span>
          </div>
          <ul className="space-y-2">
            {Object.entries(stats.by_contact_status)
              .sort((a, b) => b[1] - a[1])
              .map(([k, n]) => (
                <li key={k} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="text-gray-500 font-medium">{n.toLocaleString()}</span>
                </li>
              ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-700 font-bold">Won this lifetime</span>
            <span className="text-emerald-700 font-bold">{formatCurrencyCents(wonValue)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon, label, value, href, tone,
}: {
  icon: React.ReactNode; label: string; value: string; href: string
  tone?: 'warn'
}) {
  const toneCls = tone === 'warn'
    ? 'border-amber-200 bg-amber-50'
    : 'border-gray-200 bg-white'
  return (
    <Link
      href={href}
      className={`block rounded-xl border ${toneCls} p-4 hover:border-teal-300 transition`}
    >
      <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
        {icon} {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </Link>
  )
}
