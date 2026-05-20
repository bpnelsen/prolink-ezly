'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Hammer, CalendarDays, MapPin, Phone, Mail,
  FileSignature, FileText, MessageSquare, ArrowRight,
} from 'lucide-react'
import { supabase } from '../../../../lib/supabase-client'
import { apiFetch } from '../../../../lib/api-fetch'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return '' }
}

export default function PortalJobPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Row | null>(null)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace(`/portal/login?next=/portal/jobs/${params.id}`)
      return
    }
    const r = await apiFetch<Row>(`/api/v1/portal/jobs/${params.id}`)
    if (r.data) setData(r.data)
    else setNotFound(true)
    setLoading(false)
  }, [params.id, router])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-[#14b8a6] rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <Link href="/portal" className="inline-flex items-center gap-1 text-sm text-[#0f3a7d] font-semibold mb-4 hover:underline">
          <ArrowLeft size={14} /> Back to portal
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <h1 className="text-lg font-bold text-gray-900 mb-1">Job not found</h1>
          <p className="text-sm text-gray-500">
            This job may not be linked to your account, or it may have been removed.
          </p>
        </div>
      </div>
    )
  }

  const job: Row = data.job
  const contractor: Row = data.contractor || {}
  const contracts: Row[] = data.contracts || []
  const invoices: Row[] = data.invoices || []
  const conversation: Row | null = data.conversation

  const businessName = contractor.business_name || contractor.full_name || 'Your contractor'

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <Link href="/portal" className="inline-flex items-center gap-1 text-sm text-[#0f3a7d] font-semibold mb-4 hover:underline">
        <ArrowLeft size={14} /> Back to portal
      </Link>

      {/* Job header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#e6fcf9] flex items-center justify-center shrink-0">
            <Hammer size={18} className="text-[#0d9e8c]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-semibold uppercase tracking-wider">
                {String(job.status || 'pending').replace(/_/g, ' ')}
              </span>
              {job.trade && (
                <span className="text-xs text-gray-500 font-medium">{job.trade}</span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
              {job.title || 'Untitled job'}
            </h1>
            <p className="text-xs text-gray-500 mt-1">with {businessName}</p>
          </div>
          {Number(job.estimated_value) > 0 && (
            <div className="text-right shrink-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Estimated</p>
              <p className="text-lg font-bold text-gray-900">{fmtMoney(Number(job.estimated_value))}</p>
            </div>
          )}
        </div>

        {(job.scheduled_start || job.address || job.description) && (
          <div className="mt-5 pt-5 border-t border-gray-100 grid sm:grid-cols-2 gap-4">
            {job.scheduled_start && (
              <Meta icon={<CalendarDays size={14} />} label="Scheduled">
                {fmtDate(job.scheduled_start)}
                {job.scheduled_end ? ` – ${fmtDate(job.scheduled_end)}` : ''}
              </Meta>
            )}
            {job.address && (
              <Meta icon={<MapPin size={14} />} label="Address">{job.address}</Meta>
            )}
            {job.description && (
              <div className="sm:col-span-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Contracts on this job */}
          <Section title="Contracts" icon={<FileSignature size={15} />} count={contracts.length}>
            {contracts.length === 0 ? (
              <Empty text="No contracts on this job yet." />
            ) : contracts.map(c => (
              <Link key={c.id} href={`/portal/contracts/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 transition">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">Contract {c.contract_number}</p>
                  <p className="text-xs text-gray-400">{c.status} · {fmtDate(c.created_at)}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 shrink-0">{fmtMoney(Number(c.contract_sum))}</p>
              </Link>
            ))}
          </Section>

          {/* Invoices on this job */}
          <Section title="Invoices" icon={<FileText size={15} />} count={invoices.length}>
            {invoices.length === 0 ? (
              <Empty text="No invoices on this job yet." />
            ) : invoices.map(i => (
              <Link key={i.id} href={`/portal/invoices/${i.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 transition">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">Invoice {i.invoice_number}</p>
                  <p className="text-xs text-gray-400">{i.status} · {fmtDate(i.issue_date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{fmtMoney(Number(i.total))}</p>
                  {Number(i.balance_due) > 0
                    ? <p className="text-xs font-semibold text-orange-600">{fmtMoney(Number(i.balance_due))} due</p>
                    : <p className="text-xs font-semibold text-green-600">Paid</p>}
                </div>
              </Link>
            ))}
          </Section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {conversation && (
            <Link
              href={`/portal/conversations/${conversation.id}`}
              className="flex items-center justify-between gap-3 px-5 py-4 bg-[#0f3a7d] text-white rounded-2xl shadow-sm hover:bg-[#082860] transition"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare size={16} />
                <p className="text-sm font-semibold">Message your contractor</p>
              </div>
              <ArrowRight size={14} />
            </Link>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Your Contractor</p>
              <p className="text-base font-bold text-gray-900 mt-0.5 truncate">{businessName}</p>
            </div>
            <div className="divide-y divide-gray-100">
              {contractor.phone && (
                <a href={`tel:${contractor.phone}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                  <Phone size={14} className="text-[#0f3a7d]" />
                  <p className="text-sm font-semibold text-gray-900 truncate">{contractor.phone}</p>
                </a>
              )}
              {contractor.email && (
                <a href={`mailto:${contractor.email}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                  <Mail size={14} className="text-[#0f3a7d]" />
                  <p className="text-sm font-semibold text-gray-900 truncate">{contractor.email}</p>
                </a>
              )}
              {!contractor.phone && !contractor.email && (
                <p className="px-5 py-4 text-xs text-gray-400">No contact details on file.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Meta({ icon, label, children }: { icon: React.ReactElement; label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-1">
        <span className="text-[#0f3a7d]">{icon}</span> {label}
      </p>
      <p className="text-sm text-gray-800">{children}</p>
    </div>
  )
}

function Section({ title, icon, count, children }: { title: string; icon: React.ReactElement; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#0f3a7d]">{icon}</span>
          <p className="text-sm font-bold text-gray-900">{title}</p>
        </div>
        <p className="text-xs font-semibold text-gray-400">{count}</p>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 text-center py-8">{text}</p>
}
