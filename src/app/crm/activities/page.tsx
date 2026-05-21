'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, AlertCircle, ClipboardList } from 'lucide-react'
import { crmAPI, formatDateTime } from '@/lib/crm-client'
import type { Activity, ImportedContractor } from '@/lib/crm-types'

type Filter = 'open' | 'overdue' | 'all'

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [contractors, setContractors] = useState<Record<string, ImportedContractor>>({})
  const [filter, setFilter] = useState<Filter>('open')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    crmAPI.activities.list({ open_only: filter === 'open' || filter === 'overdue', limit: 200 })
      .then(async (res) => {
        if (cancelled) return
        setActivities(res.items)
        const ids = Array.from(new Set(res.items.map(a => a.contractor_id))).slice(0, 200)
        if (ids.length > 0) {
          // Cheap lookup — fetch a batch of contractors via the list API and filter.
          // Could be optimized to a dedicated /by-ids endpoint later.
          const list = await crmAPI.contractors.list({ limit: 500 })
          if (cancelled) return
          const map: Record<string, ImportedContractor> = {}
          for (const c of list.items) if (ids.includes(c.id)) map[c.id] = c
          setContractors(map)
        }
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [filter])

  const visible = useMemo(() => {
    if (filter === 'overdue') {
      const now = new Date()
      return activities.filter(a => a.due_at && new Date(a.due_at) < now && !a.completed)
    }
    return activities
  }, [activities, filter])

  const toggle = async (a: Activity) => {
    try {
      const { activity: updated } = await crmAPI.activities.patch(a.id, { completed: !a.completed })
      setActivities(curr => curr.map(x => x.id === updated.id ? updated : x))
    } catch (e) { alert((e as Error).message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
          <p className="text-sm text-gray-500 mt-1">Tasks, calls, and meetings across the pipeline.</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-xs font-bold">
          {(['open', 'overdue', 'all'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md transition ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {f === 'open' ? 'Open' : f === 'overdue' ? 'Overdue' : 'All recent'}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && visible.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-sm text-gray-400">
          <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
          {filter === 'overdue' ? 'No overdue activities — nice.' : 'No activities to show.'}
        </div>
      )}

      <ul className="space-y-2">
        {visible.map(a => {
          const c = contractors[a.contractor_id]
          const overdue = !a.completed && a.due_at && new Date(a.due_at) < new Date()
          return (
            <li key={a.id} className={`bg-white border rounded-xl p-3 flex items-center gap-3 ${overdue ? 'border-rose-200' : 'border-gray-200'}`}>
              <button
                onClick={() => toggle(a)}
                className={`shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition ${
                  a.completed
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-gray-300 text-transparent hover:border-emerald-500 hover:text-emerald-500'
                }`}
                title={a.completed ? 'Mark as open' : 'Mark complete'}
              ><Check size={14} /></button>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className={`font-bold ${a.completed ? 'text-gray-400 line-through' : 'text-gray-900'} truncate`}>
                    {a.subject || a.body?.slice(0, 80) || `(${a.kind})`}
                  </p>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{a.kind}</span>
                  {overdue && (
                    <span className="text-[10px] uppercase tracking-wider font-bold text-rose-600 flex items-center gap-1">
                      <AlertCircle size={10} /> Overdue
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {a.due_at && <>Due {formatDateTime(a.due_at)} · </>}
                  {c?.business_name && (
                    <Link href={`/crm/contractors/${a.contractor_id}`} className="text-teal-700 hover:underline">
                      {c.business_name}
                    </Link>
                  )}
                  {a.owner_email && <span className="ml-1"> · {a.owner_email}</span>}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
