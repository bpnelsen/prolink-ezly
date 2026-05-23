'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, MessageSquare, FileSignature, Hammer,
  DollarSign, Bell, ClipboardList, AlertCircle,
  Phone, Mail, ArrowRight, CalendarDays,
} from 'lucide-react'
import { supabase } from '../../lib/supabase-client'
import { apiFetch } from '../../lib/api-fetch'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>
type Tab = 'invoices' | 'jobs' | 'messages' | 'contracts'

const ACTIVE_JOB_STATUSES = new Set(['lead', 'estimate', 'scheduled', 'in_progress', 'on_hold'])

function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }
  catch { return '' }
}

export default function PortalDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Row | null>(null)
  const [tab, setTab] = useState<Tab>('invoices')

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/portal/login')
      return
    }
    const r = await apiFetch<Row>('/api/v1/portal/summary')
    if (r.data) setData(r.data)
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  const businesses: Record<string, string> = data?.businesses || {}
  const client: Row | null = data?.client || null
  const contractor: Row | null = data?.primary_contractor || null
  const invoices: Row[] = data?.invoices || []
  const jobs: Row[] = data?.jobs || []
  const conversations: Row[] = data?.conversations || []
  const contracts: Row[] = data?.contracts || []
  const unreadMessages: number = data?.unread_message_count || 0
  const linked = data?.linked

  const kpis = useMemo(() => {
    const balanceDue = invoices.reduce((s, i) => s + Number(i.balance_due || 0), 0)
    const openJobs = jobs.filter(j => ACTIVE_JOB_STATUSES.has(String(j.status))).length
    const contractsToSign = contracts.filter(c =>
      ['pending', 'sent', 'awaiting_signature'].includes(String(c.status))
    ).length
    return { balanceDue, openJobs, contractsToSign }
  }, [invoices, jobs, contracts])

  // "Next steps" — concrete actions ranked by urgency.
  const nextSteps = useMemo(() => {
    const items: Array<{ key: string; label: string; href: string; tone: 'warn' | 'info' | 'ok' }> = []
    for (const i of invoices) {
      if (Number(i.balance_due || 0) <= 0) continue
      const dueIn = i.due_date ? Math.ceil((new Date(i.due_date).getTime() - Date.now()) / 86400000) : null
      const overdue = dueIn !== null && dueIn < 0
      const label = overdue
        ? `Invoice ${i.invoice_number} is overdue — ${fmtMoney(Number(i.balance_due))} past due`
        : dueIn !== null && dueIn <= 7
          ? `Invoice ${i.invoice_number} due in ${dueIn} day${dueIn === 1 ? '' : 's'} — ${fmtMoney(Number(i.balance_due))}`
          : `Invoice ${i.invoice_number} — ${fmtMoney(Number(i.balance_due))} due`
      items.push({ key: `inv-${i.id}`, label, href: `/portal/invoices/${i.id}`, tone: overdue ? 'warn' : 'info' })
    }
    for (const c of contracts) {
      if (!['pending', 'sent', 'awaiting_signature'].includes(String(c.status))) continue
      items.push({
        key: `con-${c.id}`,
        label: `Contract ${c.contract_number} is waiting for your signature`,
        href: `/portal/contracts/${c.id}`,
        tone: 'info',
      })
    }
    if (unreadMessages > 0 && conversations[0]) {
      items.push({
        key: `msg-${conversations[0].id}`,
        label: `${unreadMessages} new message${unreadMessages === 1 ? '' : 's'} from your contractor`,
        href: `/portal/conversations/${conversations[0].id}`,
        tone: 'info',
      })
    }
    return items.slice(0, 4)
  }, [invoices, contracts, conversations, unreadMessages])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-[#14b8a6] rounded-full animate-spin" />
      </div>
    )
  }

  if (!linked) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#e6fcf9] flex items-center justify-center">
            <Bell size={22} className="text-[#0d9e8c]" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-1">No records linked yet</h1>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Open the portal invite link your contractor sent you to connect your account.
          </p>
        </div>
      </div>
    )
  }

  const firstName = client?.first_name || 'there'
  const businessName = contractor?.business_name || contractor?.full_name || 'your contractor'

  const tabs: Array<[Tab, string, number, React.ReactElement]> = [
    ['invoices', 'Invoices', invoices.length, <FileText key="i" size={14} />],
    ['jobs', 'Jobs', jobs.length, <Hammer key="j" size={14} />],
    ['messages', 'Messages', conversations.length, <MessageSquare key="m" size={14} />],
    ['contracts', 'Contracts', contracts.length, <FileSignature key="c" size={14} />],
  ]

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      {/* Welcome banner */}
      <div>
        <h1 className="text-2xl md:text-[28px] font-bold text-gray-900 tracking-tight">
          Welcome back, {firstName}.
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Here&apos;s what&apos;s happening with <span className="font-semibold text-gray-700">{businessName}</span>.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="Balance Due"
          value={fmtMoney(kpis.balanceDue)}
          icon={<DollarSign size={16} />}
          tone={kpis.balanceDue > 0 ? 'warn' : 'ok'}
          href={kpis.balanceDue > 0 ? undefined : undefined}
          onClick={() => setTab('invoices')}
        />
        <Kpi
          label="Open Jobs"
          value={String(kpis.openJobs)}
          icon={<Hammer size={16} />}
          tone="info"
          onClick={() => setTab('jobs')}
        />
        <Kpi
          label="Unread Messages"
          value={String(unreadMessages)}
          icon={<MessageSquare size={16} />}
          tone={unreadMessages > 0 ? 'info' : 'ok'}
          onClick={() => setTab('messages')}
        />
        <Kpi
          label="To Sign"
          value={String(kpis.contractsToSign)}
          icon={<FileSignature size={16} />}
          tone={kpis.contractsToSign > 0 ? 'info' : 'ok'}
          onClick={() => setTab('contracts')}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: next steps + tabbed list */}
        <div className="lg:col-span-2 space-y-6">
          {nextSteps.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <ClipboardList size={15} className="text-[#0f3a7d]" />
                <p className="text-sm font-bold text-gray-900">Next steps</p>
              </div>
              <ul className="divide-y divide-gray-100">
                {nextSteps.map(s => (
                  <li key={s.key}>
                    <Link href={s.href} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50 transition">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {s.tone === 'warn'
                          ? <AlertCircle size={14} className="text-orange-500 shrink-0" />
                          : <Bell size={14} className="text-[#0d9e8c] shrink-0" />}
                        <p className="text-sm text-gray-800 truncate">{s.label}</p>
                      </div>
                      <ArrowRight size={14} className="text-gray-400 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tabs */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {tabs.map(([id, label, count, icon]) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                    tab === id
                      ? 'bg-[#0f3a7d] text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}>
                  {icon} {label} <span className={tab === id ? 'text-white/70' : 'text-gray-400'}>({count})</span>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
              {tab === 'invoices' && (invoices.length === 0 ? (
                <Empty text="No invoices yet." />
              ) : invoices.map(i => (
                <Link key={i.id} href={`/portal/invoices/${i.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 transition">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">Invoice {i.invoice_number}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {businesses[i.contractor_id] || 'Contractor'} · {i.status}
                      {i.issue_date ? ` · ${fmtDate(i.issue_date)}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{fmtMoney(Number(i.total))}</p>
                    {Number(i.balance_due) > 0
                      ? <p className="text-xs font-semibold text-orange-600">{fmtMoney(Number(i.balance_due))} due</p>
                      : <p className="text-xs font-semibold text-green-600">Paid</p>}
                  </div>
                </Link>
              )))}

              {tab === 'jobs' && (jobs.length === 0 ? (
                <Empty text="No jobs yet." />
              ) : jobs.map(j => (
                <Link key={j.id} href={`/portal/jobs/${j.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 transition">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{j.title || 'Untitled job'}</p>
                    <p className="text-xs text-gray-400 truncate flex items-center gap-1.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 font-semibold">{j.status || 'pending'}</span>
                      {j.trade ? <span>· {j.trade}</span> : null}
                      {j.scheduled_start ? <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> {fmtDate(j.scheduled_start)}</span> : null}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {Number(j.estimated_value) > 0
                      ? <p className="text-sm font-bold text-gray-900">{fmtMoney(Number(j.estimated_value))}</p>
                      : <ArrowRight size={14} className="text-gray-400" />}
                  </div>
                </Link>
              )))}

              {tab === 'messages' && (conversations.length === 0 ? (
                <Empty text="No conversations yet." />
              ) : conversations.map(c => (
                <Link key={c.id} href={`/portal/conversations/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 transition">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{c.jobs?.title || 'Conversation'}</p>
                    <p className="text-xs text-gray-400 truncate">{businesses[c.contractor_id] || 'Contractor'}</p>
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">{fmtDate(c.last_message_at)}</p>
                </Link>
              )))}

              {tab === 'contracts' && (contracts.length === 0 ? (
                <Empty text="No contracts yet." />
              ) : contracts.map(c => (
                <Link key={c.id} href={`/portal/contracts/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 transition">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">Contract {c.contract_number}</p>
                    <p className="text-xs text-gray-400 truncate">{businesses[c.contractor_id] || 'Contractor'} · {c.status}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 shrink-0">{fmtMoney(Number(c.contract_sum))}</p>
                </Link>
              )))}
            </div>
          </div>
        </div>

        {/* Right column: contractor contact card */}
        <aside className="space-y-4">
          {contractor && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Your Contractor</p>
                <p className="text-base font-bold text-gray-900 mt-0.5 truncate">
                  {contractor.business_name || contractor.full_name || 'Your Contractor'}
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {contractor.phone && (
                  <a href={`tel:${contractor.phone}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                    <Phone size={14} className="text-[#0f3a7d]" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Phone</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{contractor.phone}</p>
                    </div>
                  </a>
                )}
                {contractor.email && (
                  <a href={`mailto:${contractor.email}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                    <Mail size={14} className="text-[#0f3a7d]" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Email</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{contractor.email}</p>
                    </div>
                  </a>
                )}
                {!contractor.phone && !contractor.email && (
                  <p className="px-5 py-4 text-xs text-gray-400">No contact details on file.</p>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function Kpi({ label, value, icon, tone, onClick }: {
  label: string
  value: string
  icon: React.ReactElement
  tone: 'warn' | 'info' | 'ok'
  href?: string
  onClick?: () => void
}) {
  const accent =
    tone === 'warn' ? '#f59e0b' :
    tone === 'info' ? '#0f3a7d' :
    '#10b981'
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:-translate-y-px transition-all"
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
    </button>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 text-center py-12">{text}</p>
}
