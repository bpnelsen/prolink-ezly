'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { formatDateTime } from '@/lib/crm-client'

type Campaign = {
  id: string
  name: string
  subject: string
  status: 'draft' | 'sending' | 'done' | 'cancelled'
  total_recipients: number
  sent_count: number
  failed_count: number
  skipped_count: number
  created_by_email: string | null
  created_at: string
  finished_at: string | null
}

export default function CampaignsListPage() {
  const [items, setItems] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/crm/campaigns', {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        })
        if (!res.ok) throw new Error((await res.json())?.message || res.statusText)
        const json = await res.json()
        if (!cancelled) setItems(json.items || [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Mass-email blasts to filtered contractors. Each send respects DNC and includes an unsubscribe link.</p>
        </div>
        <Link
          href="/crm/campaigns/new"
          className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5"
        >
          <Plus size={16} /> New campaign
        </Link>
      </div>

      {error && <div className="text-sm text-rose-600">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Subject</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Sent</th>
              <th className="text-right px-4 py-3">Skipped</th>
              <th className="text-right px-4 py-3">Failed</th>
              <th className="text-left px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                No campaigns yet. <Link href="/crm/campaigns/new" className="text-teal-700 font-semibold hover:underline">Create your first one</Link>.
              </td></tr>
            )}
            {items.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 align-top">
                  <Link href={`/crm/campaigns/${c.id}`} className="font-bold text-gray-900 hover:text-teal-700 flex items-center gap-1.5">
                    <Mail size={13} className="text-gray-400" /> {c.name}
                  </Link>
                  <p className="text-[11px] text-gray-400 mt-0.5">{c.created_by_email}</p>
                </td>
                <td className="px-4 py-3 align-top text-gray-700">{c.subject}</td>
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 align-top text-right text-gray-900 font-semibold">{c.sent_count}</td>
                <td className="px-4 py-3 align-top text-right text-gray-500">{c.skipped_count}</td>
                <td className="px-4 py-3 align-top text-right text-rose-600">{c.failed_count || ''}</td>
                <td className="px-4 py-3 align-top text-[11px] text-gray-500">
                  {formatDateTime(c.finished_at || c.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: Campaign['status'] }) {
  const cls =
    status === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : status === 'sending' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : status === 'cancelled' ? 'bg-gray-100 text-gray-500 border-gray-200'
    : 'bg-amber-50 text-amber-700 border-amber-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
      {status}
    </span>
  )
}
