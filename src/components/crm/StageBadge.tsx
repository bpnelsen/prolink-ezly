'use client'
import type { PipelineStage } from '@/lib/crm-types'

const COLORS: Record<string, string> = {
  new:            'bg-gray-100 text-gray-700 border-gray-200',
  contacted:      'bg-blue-50 text-blue-700 border-blue-200',
  demo_scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  demo_done:      'bg-violet-50 text-violet-700 border-violet-200',
  negotiating:    'bg-amber-50 text-amber-700 border-amber-200',
  won:            'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost:           'bg-rose-50 text-rose-700 border-rose-200',
}

export function StageBadge({
  stage, stages,
}: {
  stage: string | null | undefined
  stages?: PipelineStage[]
}) {
  if (!stage) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-gray-50 text-gray-500 border-gray-200">
      No deal
    </span>
  )
  const meta = stages?.find(s => s.key === stage)
  const label = meta?.label || stage.replace(/_/g, ' ')
  const cls = COLORS[stage] || 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
      {label}
    </span>
  )
}
