'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { crmAPI, formatCurrencyCents } from '@/lib/crm-client'
import type { ContractorWithDeal, PipelineStage } from '@/lib/crm-types'

export default function PipelinePage() {
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [items, setItems] = useState<ContractorWithDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      crmAPI.stages(),
      // Fetch up to 500 deals' contractors. If we have more we'll paginate later.
      crmAPI.contractors.list({ limit: 500 }),
    ])
      .then(([s, c]) => {
        if (cancelled) return
        setStages(s.stages)
        setItems(c.items.filter(x => x.deal))
      })
      .catch(e => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  const byStage = useMemo(() => {
    const map: Record<string, ContractorWithDeal[]> = {}
    for (const s of stages) map[s.key] = []
    for (const c of items) {
      if (c.deal && map[c.deal.stage_key]) map[c.deal.stage_key].push(c)
    }
    return map
  }, [stages, items])

  const moveDeal = async (contractor: ContractorWithDeal, newStage: string) => {
    if (!contractor.deal || contractor.deal.stage_key === newStage) return
    const prev = contractor.deal.stage_key
    // Optimistic update
    setItems(curr => curr.map(c =>
      c.id === contractor.id && c.deal
        ? { ...c, deal: { ...c.deal, stage_key: newStage } }
        : c
    ))
    try {
      await crmAPI.deals.patch(contractor.deal.id, { stage_key: newStage })
    } catch (e) {
      alert((e as Error).message)
      setItems(curr => curr.map(c =>
        c.id === contractor.id && c.deal
          ? { ...c, deal: { ...c.deal, stage_key: prev } }
          : c
      ))
    }
  }

  if (loading) return <div className="text-sm text-gray-500">Loading pipeline…</div>
  if (error) return <div className="text-sm text-rose-600">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">Drag a card between columns to update its stage.</p>
        </div>
        <Link
          href="/crm/contractors"
          className="text-sm font-bold text-teal-700 hover:text-teal-800"
        >See all contractors →</Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => {
          const stageItems = byStage[stage.key] || []
          const totalValue = stageItems.reduce((s, c) => s + (c.deal?.value_cents || 0), 0)
          const isOver = dragOverStage === stage.key
          return (
            <div
              key={stage.key}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key) }}
              onDragLeave={() => setDragOverStage(d => d === stage.key ? null : d)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverStage(null)
                const id = e.dataTransfer.getData('text/plain')
                const c = items.find(x => x.id === id)
                if (c) moveDeal(c, stage.key)
                setDraggingId(null)
              }}
              className={`shrink-0 w-72 bg-gray-100 rounded-xl p-3 transition ${isOver ? 'ring-2 ring-teal-500' : ''}`}
            >
              <div className="flex items-center justify-between px-1 mb-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600">
                  {stage.label}
                </p>
                <p className="text-[11px] text-gray-500 font-semibold">
                  {stageItems.length} · {formatCurrencyCents(totalValue)}
                </p>
              </div>

              <div className="space-y-2 min-h-[120px]">
                {stageItems.map(c => (
                  <Link
                    key={c.id}
                    href={`/crm/contractors/${c.id}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', c.id)
                      e.dataTransfer.effectAllowed = 'move'
                      setDraggingId(c.id)
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={`block bg-white border border-gray-200 rounded-lg p-3 hover:border-teal-300 shadow-sm transition ${
                      draggingId === c.id ? 'opacity-50' : ''
                    }`}
                  >
                    <p className="font-bold text-gray-900 text-sm truncate">{c.business_name || 'Unnamed'}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-600">
                      <span className="font-bold">{formatCurrencyCents(c.deal?.value_cents || 0)}</span>
                      {c.deal?.probability != null && (
                        <span className="text-gray-400">{c.deal.probability}%</span>
                      )}
                    </div>
                  </Link>
                ))}
                {stageItems.length === 0 && (
                  <p className="text-[11px] text-gray-400 text-center py-6">Drop here</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
