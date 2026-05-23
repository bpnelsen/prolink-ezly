'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Phone, Mail, MapPin, ExternalLink } from 'lucide-react'
import { crmAPI, formatDate } from '@/lib/crm-client'
import type { ContractorWithDeal, PipelineStage } from '@/lib/crm-types'
import { GlobalSearch } from '@/components/crm/CRMShell'
import { StageBadge } from '@/components/crm/StageBadge'

const PAGE_SIZE = 50

export default function ContractorsListPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [items, setItems] = useState<ContractorWithDeal[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])

  const q = params.get('q') || ''
  const stateFilter = params.get('state') || ''
  const contactStatus = params.get('contact_status') || ''
  const stage = params.get('stage') || ''
  const offset = Number(params.get('offset') || 0)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await crmAPI.contractors.list({
        q, state: stateFilter, contact_status: contactStatus, stage,
        limit: PAGE_SIZE, offset,
      })
      setItems(data.items)
      setTotal(data.total)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [q, stateFilter, contactStatus, stage, offset])

  useEffect(() => { load() }, [load])
  useEffect(() => { crmAPI.stages().then(s => setStages(s.stages)).catch(() => {}) }, [])

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString())
    Object.entries(patch).forEach(([k, v]) => {
      if (v) next.set(k, v); else next.delete(k)
    })
    if (!('offset' in patch)) next.delete('offset')
    router.push(`/crm/contractors${next.toString() ? `?${next}` : ''}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contractors</h1>
          <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()} total · imported from outreach sources</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/crm/contractors/new"
            className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm"
          >+ Add contractor</Link>
          <Link
            href="/crm/import"
            className="border border-gray-200 hover:border-teal-500 text-gray-700 text-sm font-bold px-4 py-2 rounded-lg"
          >Import CSV</Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <GlobalSearch initial={q} onSubmit={(v) => update({ q: v })} />
        <FilterSelect
          value={stateFilter} onChange={(v) => update({ state: v })}
          options={STATES} placeholder="All states"
        />
        <FilterSelect
          value={contactStatus} onChange={(v) => update({ contact_status: v })}
          options={CONTACT_STATUSES} placeholder="All contact statuses"
        />
        <FilterSelect
          value={stage} onChange={(v) => update({ stage: v })}
          options={stages.map(s => ({ value: s.key, label: s.label }))}
          placeholder="All stages"
        />
        {(q || stateFilter || contactStatus || stage) && (
          <button
            onClick={() => router.push('/crm/contractors')}
            className="text-xs font-bold text-gray-500 hover:text-gray-800"
          >Clear filters</button>
        )}
      </div>

      {error && <div className="text-sm text-rose-600">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">Business</th>
                <th className="text-left px-4 py-3">Contact</th>
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-left px-4 py-3">License</th>
                <th className="text-left px-4 py-3">Stage</th>
                <th className="text-left px-4 py-3">Last contact</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No contractors found. Try adjusting filters or <Link href="/crm/import" className="text-teal-700 font-semibold hover:underline">import a CSV</Link>.
                </td></tr>
              )}
              {items.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/crm/contractors/${c.id}`)}
                >
                  <td className="px-4 py-3 align-top">
                    <p className="font-bold text-gray-900">{c.business_name || '—'}</p>
                    {c.website && (
                      <a href={c.website} target="_blank" rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-gray-500 hover:text-teal-700 inline-flex items-center gap-1 mt-0.5">
                        {c.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-gray-700">
                    {c.phone && (
                      <p className="flex items-center gap-1.5"><Phone size={12} className="text-gray-400" /> {c.phone}</p>
                    )}
                    {c.email && (
                      <p className="flex items-center gap-1.5 text-[12px]"><Mail size={12} className="text-gray-400" /> {c.email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-gray-600">
                    {(c.city || c.state) && (
                      <p className="flex items-center gap-1.5"><MapPin size={12} className="text-gray-400" />
                        {[c.city, c.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {c.zip && <p className="text-[11px] text-gray-400 ml-4">{c.zip}</p>}
                  </td>
                  <td className="px-4 py-3 align-top text-[12px] text-gray-600">
                    {c.license_number ? (
                      <>
                        <p>{c.license_number}</p>
                        {c.license_status && (
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">{c.license_status}</p>
                        )}
                      </>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StageBadge stage={c.deal?.stage_key} stages={stages} />
                  </td>
                  <td className="px-4 py-3 align-top text-[12px] text-gray-500">
                    {c.contact_date ? formatDate(c.contact_date) : <span className="text-gray-300">Never</span>}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <span className="text-teal-700 font-bold text-xs">Open →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination total={total} offset={offset} onChange={(o) => update({ offset: String(o) })} />
    </div>
  )
}

function FilterSelect({
  value, onChange, options, placeholder,
}: {
  value: string; onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Pagination({
  total, offset, onChange,
}: { total: number; offset: number; onChange: (o: number) => void }) {
  if (total <= PAGE_SIZE) return null
  const page = Math.floor(offset / PAGE_SIZE) + 1
  const pages = Math.ceil(total / PAGE_SIZE)
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">
        Page {page} of {pages} · Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(Math.max(0, offset - PAGE_SIZE))}
          disabled={offset === 0}
          className="px-3 py-1.5 border border-gray-200 rounded-lg font-semibold disabled:opacity-40 hover:border-teal-500"
        >Previous</button>
        <button
          onClick={() => onChange(offset + PAGE_SIZE)}
          disabled={offset + PAGE_SIZE >= total}
          className="px-3 py-1.5 border border-gray-200 rounded-lg font-semibold disabled:opacity-40 hover:border-teal-500"
        >Next</button>
      </div>
    </div>
  )
}

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
].map(s => ({ value: s, label: s }))

const CONTACT_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'unqualified', label: 'Unqualified' },
  { value: 'do_not_contact', label: 'Do not contact' },
]
