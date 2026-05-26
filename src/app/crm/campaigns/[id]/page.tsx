'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { formatDateTime } from '@/lib/crm-client'

type Campaign = {
  id: string
  name: string
  subject: string
  body: string
  status: string
  total_recipients: number
  sent_count: number
  failed_count: number
  skipped_count: number
  created_by_email: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}

type Recipient = {
  id: string
  contractor_id: string
  email: string
  status: 'queued' | 'sent' | 'failed' | 'skipped_dnc' | 'skipped_no_email' | 'unsubscribed'
  error_msg: string | null
  sent_at: string | null
  unsubscribed_at: string | null
  first_opened_at: string | null
  last_opened_at: string | null
  open_count: number
  contractor: { id: string; business_name: string | null; email: string | null; contact_status: string | null } | null
}

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`/api/crm/campaigns/${params.id}`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        })
        if (!res.ok) throw new Error((await res.json())?.message || res.statusText)
        const json = await res.json()
        if (cancelled) return
        setCampaign(json.campaign)
        setRecipients(json.recipients || [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [params.id])

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>
  if (error) return <div className="text-sm text-rose-600">{error}</div>
  if (!campaign) return <div className="text-sm text-gray-500">Not found.</div>

  const uniqueOpens = recipients.filter(r => r.open_count > 0).length

  return (
    <div className="space-y-6">
      <Link href="/crm/campaigns" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 font-semibold">
        <ArrowLeft size={14} /> Campaigns
      </Link>

      <header className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
        <p className="text-sm text-gray-700"><strong>Subject:</strong> {campaign.subject}</p>
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span>Status: <strong className="text-gray-900 uppercase">{campaign.status}</strong></span>
          <span>Created by {campaign.created_by_email || '—'}</span>
          <span>Started {campaign.started_at ? formatDateTime(campaign.started_at) : '—'}</span>
          <span>Finished {campaign.finished_at ? formatDateTime(campaign.finished_at) : '—'}</span>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Total recipients" value={campaign.total_recipients} />
        <Stat label="Sent" value={campaign.sent_count} tone="good" />
        <Stat label="Opened (unique)" value={uniqueOpens} tone="good" />
        <Stat label="Skipped" value={campaign.skipped_count} tone="muted" />
        <Stat label="Failed" value={campaign.failed_count} tone={campaign.failed_count > 0 ? 'bad' : 'muted'} />
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
        <h2 className="font-bold text-gray-900 text-sm">Body (snapshot at send time)</h2>
        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 border border-gray-200 rounded-lg p-3">{campaign.body}</pre>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <h2 className="font-bold text-gray-900 text-sm px-5 pt-5 pb-2">Recipients ({recipients.length})</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <tr>
              <th className="text-left px-4 py-3">Contractor</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Opens</th>
              <th className="text-left px-4 py-3">When / detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recipients.map(r => (
              <tr key={r.id}>
                <td className="px-4 py-2.5 align-top">
                  <Link href={`/crm/contractors/${r.contractor_id}`} className="text-gray-900 font-semibold hover:text-teal-700">
                    {r.contractor?.business_name || '—'}
                  </Link>
                </td>
                <td className="px-4 py-2.5 align-top text-gray-700">{r.email || <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2.5 align-top">
                  <RecipientStatusBadge status={r.status} />
                </td>
                <td className="px-4 py-2.5 align-top text-[11px] text-gray-700">
                  {r.open_count > 0 ? (
                    <span
                      className="inline-flex items-center gap-1 text-teal-700 font-semibold"
                      title={r.first_opened_at ? `First opened ${formatDateTime(r.first_opened_at)}` : ''}
                    >
                      {r.open_count}× · last {r.last_opened_at ? formatDateTime(r.last_opened_at) : '—'}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 align-top text-[11px] text-gray-500">
                  {r.unsubscribed_at ? `Unsubscribed ${formatDateTime(r.unsubscribed_at)}`
                  : r.sent_at ? formatDateTime(r.sent_at)
                  : r.error_msg ? <span className="text-rose-600">{r.error_msg}</span>
                  : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function Stat({ label, value, tone = 'neutral' }: {
  label: string; value: number; tone?: 'neutral' | 'good' | 'bad' | 'muted'
}) {
  const cls = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-rose-700' : tone === 'muted' ? 'text-gray-500' : 'text-gray-900'
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${cls}`}>{value.toLocaleString()}</p>
    </div>
  )
}

function RecipientStatusBadge({ status }: { status: Recipient['status'] }) {
  const map: Record<Recipient['status'], string> = {
    queued: 'bg-amber-50 text-amber-700 border-amber-200',
    sent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
    skipped_dnc: 'bg-rose-100 text-rose-800 border-rose-200',
    skipped_no_email: 'bg-gray-100 text-gray-600 border-gray-200',
    unsubscribed: 'bg-rose-50 text-rose-700 border-rose-200',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${map[status]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
