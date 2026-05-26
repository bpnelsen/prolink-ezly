'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, FlaskConical, AlertTriangle, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { crmAPI } from '@/lib/crm-client'
import { templatesAPI } from '@/lib/crm-templates-client'
import { buildVars, renderTemplate, type CRMTemplate } from '@/lib/crm-templates'
import type { ContractorWithDeal, PipelineStage } from '@/lib/crm-types'

type Filter = {
  q: string
  state: string
  contact_status: string
  stage: string
}

export default function NewCampaignPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [templates, setTemplates] = useState<CRMTemplate[]>([])

  const [filter, setFilter] = useState<Filter>({ q: '', state: '', contact_status: '', stage: '' })
  const [stages, setStages] = useState<PipelineStage[]>([])

  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [sampleRecipient, setSampleRecipient] = useState<ContractorWithDeal | null>(null)
  const [counting, setCounting] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // Load templates + stages once.
  useEffect(() => {
    templatesAPI.list('email').then(({ items }) => setTemplates(items)).catch(() => {})
    crmAPI.stages().then(s => setStages(s.stages)).catch(() => {})
  }, [])

  // Apply template choice → fill subject/body.
  useEffect(() => {
    if (!templateId) return
    const t = templates.find(x => x.id === templateId)
    if (!t) return
    setSubject(t.subject || '')
    setBody(t.body)
  }, [templateId, templates])

  // Recount recipients whenever the filter changes.
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      setCounting(true)
      try {
        const data = await crmAPI.contractors.list({
          q: filter.q, state: filter.state,
          contact_status: filter.contact_status, stage: filter.stage,
          limit: 1, offset: 0,
        })
        if (cancelled) return
        setRecipientCount(data.total)
        setSampleRecipient(data.items[0] || null)
      } catch {
        if (!cancelled) { setRecipientCount(0); setSampleRecipient(null) }
      } finally {
        if (!cancelled) setCounting(false)
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [filter])

  const previewVars = useMemo(() => sampleRecipient ? buildVars({
    contractor: sampleRecipient,
    sender_name: null,
    sender_email: null,
  }) : null, [sampleRecipient])

  const previewSubject = previewVars ? renderTemplate(subject, previewVars) : subject
  const previewBody = previewVars ? renderTemplate(body, previewVars) : body

  const validate = (): string | null => {
    if (!name.trim()) return 'Give the campaign a name.'
    if (!subject.trim()) return 'Subject is required.'
    if (!body.trim()) return 'Body is required.'
    return null
  }

  const sendTest = async () => {
    const v = validate(); if (v) { setError(v); return }
    setTesting(true); setError(null); setInfo(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/crm/campaigns/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ subject, body }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || res.statusText)
      setInfo(`Test sent to ${json.sent_to}.`)
    } catch (e) {
      setError((e as Error).message)
    } finally { setTesting(false) }
  }

  const sendCampaign = async () => {
    const v = validate(); if (v) { setError(v); return }
    if (!recipientCount) { setError('No recipients match the filter.'); return }
    if (!confirm(`Send this email to ${recipientCount} contractor${recipientCount === 1 ? '' : 's'}? This cannot be undone.`)) return

    setSubmitting(true); setError(null); setInfo(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/crm/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          name, subject, body,
          template_id: templateId || null,
          filter,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || res.statusText)
      router.push(`/crm/campaigns/${json.campaign.id}`)
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500'
  const labelCls = 'block text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-1'

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/crm/campaigns" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 font-semibold">
        <ArrowLeft size={14} /> Campaigns
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-gray-900">New campaign</h1>
        <p className="text-sm text-gray-500 mt-1">Compose one email, send it to every contractor matching your filter.</p>
      </header>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-bold text-gray-900 text-sm">1. Compose</h2>

        <label className="block">
          <span className={labelCls}>Campaign name (internal)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls}
            placeholder="e.g. May outreach — UT general contractors" />
        </label>

        <label className="block">
          <span className={labelCls}>Start from template</span>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={inputCls}>
            <option value="">— Start from scratch —</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>

        <label className="block">
          <span className={labelCls}>Subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls}
            placeholder="Supports {{business_name}}, {{city}}, {{state}}…" />
        </label>

        <label className="block">
          <span className={labelCls}>Body</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10}
            className={`${inputCls} font-mono`}
            placeholder="Hi {{business_name}} team,&#10;&#10;…" />
        </label>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-bold text-gray-900 text-sm">2. Pick recipients</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="block">
            <span className={labelCls}>Search business name</span>
            <input value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>State</span>
            <select value={filter.state} onChange={(e) => setFilter({ ...filter, state: e.target.value })} className={inputCls}>
              <option value="">All states</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Contact status</span>
            <select value={filter.contact_status} onChange={(e) => setFilter({ ...filter, contact_status: e.target.value })} className={inputCls}>
              <option value="">Any</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="unqualified">Unqualified</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Pipeline stage</span>
            <select value={filter.stage} onChange={(e) => setFilter({ ...filter, stage: e.target.value })} className={inputCls}>
              <option value="">Any</option>
              {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-700">
            <Mail size={14} className="inline mr-1.5 text-gray-400" />
            {counting ? 'Counting…' : <>
              <strong>{(recipientCount ?? 0).toLocaleString()}</strong> contractor{recipientCount === 1 ? '' : 's'} match
              <span className="text-gray-500 text-xs ml-2">(DNC + no-email contacts are auto-skipped)</span>
            </>}
          </span>
        </div>
      </section>

      {(subject || body) && (
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="font-bold text-gray-900 text-sm">3. Preview (against a sample recipient)</h2>
          {sampleRecipient ? (
            <>
              <p className="text-[11px] text-gray-500">Rendering against: <span className="font-semibold">{sampleRecipient.business_name}</span> ({sampleRecipient.email || 'no email'})</p>
              <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <p className="font-bold text-gray-900 text-sm mb-2">{previewSubject || <span className="text-gray-400">(no subject)</span>}</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{previewBody || <span className="text-gray-400">(empty)</span>}</p>
                <p className="text-[10px] text-gray-400 mt-4 pt-3 border-t border-gray-200">— A footer with an unsubscribe link + your physical address is auto-appended at send time.</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">Adjust your filter to find a sample recipient.</p>
          )}
        </section>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg px-4 py-3 flex gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {info && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-4 py-3">{info}</div>}

      <div className="flex flex-wrap justify-end gap-3 sticky bottom-4">
        <button type="button" onClick={sendTest} disabled={testing || submitting}
          className="border border-gray-300 hover:border-teal-500 text-gray-700 text-sm font-bold px-4 py-2.5 rounded-lg disabled:opacity-50 flex items-center gap-1.5 bg-white shadow-sm">
          <FlaskConical size={14} /> {testing ? 'Sending…' : 'Send test to me'}
        </button>
        <button type="button" onClick={sendCampaign} disabled={submitting || testing || !recipientCount}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-sm flex items-center gap-1.5">
          <Send size={14} /> {submitting ? 'Sending…' : `Send to ${recipientCount ?? 0} contractor${recipientCount === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]
