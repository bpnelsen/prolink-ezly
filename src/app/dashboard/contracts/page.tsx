'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { FileText, Search } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import { apiFetch } from '../../../lib/api-fetch'

type Status = 'draft' | 'sent' | 'partially_signed' | 'executed' | 'cancelled'

interface ContractRow {
  id: string
  contract_number: string
  status: Status
  contract_sum: number
  sent_at: string | null
  executed_at: string | null
  clients: { first_name: string; last_name: string } | null
  jobs: { title: string } | null
}

const STATUS_LABEL: Record<Status | 'all', { label: string; bg: string; text: string; dot: string }> = {
  all:               { label: 'All',               bg: '',              text: '',                dot: '' },
  draft:             { label: 'Draft',             bg: 'bg-gray-50',    text: 'text-gray-700',   dot: 'bg-gray-400' },
  sent:              { label: 'Sent',              bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500' },
  partially_signed:  { label: 'Partially Signed',  bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500' },
  executed:          { label: 'Executed',          bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500' },
  cancelled:         { label: 'Cancelled',         bg: 'bg-gray-50',    text: 'text-gray-500',   dot: 'bg-gray-400' },
}

export default function ContractsPage() {
  const [rows, setRows] = useState<ContractRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    apiFetch<ContractRow[]>('/api/v1/contracts').then(r => {
      setRows(r.data || [])
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => rows.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false
    const needle = q.toLowerCase().trim()
    if (!needle) return true
    const haystack = [
      c.contract_number,
      c.jobs?.title || '',
      c.clients ? `${c.clients.first_name} ${c.clients.last_name}` : '',
    ].join(' ').toLowerCase()
    return haystack.includes(needle)
  }), [rows, filter, q])

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Contracts', href: '/dashboard/contracts' }]} />
      <div className="max-w-6xl mx-auto p-4 md:p-8 pt-14 md:pt-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Operations</p>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Contracts</h2>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {(['all', 'draft', 'sent', 'partially_signed', 'executed', 'cancelled'] as const).map(k => (
            <button key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                filter === k
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}>
              {STATUS_LABEL[k].label}
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search by contract number, project, or client…"
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm flex flex-col items-center gap-3">
              <FileText size={32} className="text-gray-300" />
              <p>No contracts yet. Generate one from a job to get started.</p>
            </div>
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <ul className="md:hidden divide-y divide-gray-100">
                {filtered.map(r => {
                  const status = STATUS_LABEL[r.status]
                  return (
                    <li key={r.id}>
                      <Link href={`/dashboard/contracts/${r.id}`} className="block p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 truncate">{r.contract_number}</p>
                            <p className="text-xs text-gray-500 truncate">{r.jobs?.title || '—'}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${status.bg} ${status.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-3">
                          <p className="text-xs text-gray-500 truncate">
                            {r.clients ? `${r.clients.first_name} ${r.clients.last_name}` : '—'}
                          </p>
                          <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                            ${Number(r.contract_sum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        {(r.sent_at || r.executed_at) && (
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
                            {r.sent_at && <span>Sent {new Date(r.sent_at).toLocaleDateString()}</span>}
                            {r.executed_at && <span>Executed {new Date(r.executed_at).toLocaleDateString()}</span>}
                          </div>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Contract</th>
                      <th className="text-left px-4 py-3 font-semibold">Project</th>
                      <th className="text-left px-4 py-3 font-semibold">Client</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="text-right px-4 py-3 font-semibold">Sum</th>
                      <th className="text-left px-4 py-3 font-semibold">Sent</th>
                      <th className="text-left px-4 py-3 font-semibold">Executed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => {
                      const status = STATUS_LABEL[r.status]
                      return (
                        <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            <Link href={`/dashboard/contracts/${r.id}`} className="hover:text-teal-700">
                              {r.contract_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{r.jobs?.title || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {r.clients ? `${r.clients.first_name} ${r.clients.last_name}` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            ${Number(r.contract_sum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {r.sent_at ? new Date(r.sent_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {r.executed_at ? new Date(r.executed_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
