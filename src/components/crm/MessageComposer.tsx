'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Mail, MessageSquare, Send, Copy, Check, Sparkles, Ban } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { templatesAPI, sendAPI } from '@/lib/crm-templates-client'
import { buildVars, renderTemplate, type CRMTemplate, type TemplateKind } from '@/lib/crm-templates'
import type { Activity, ImportedContractor } from '@/lib/crm-types'

export default function MessageComposer({
  contractor, onActivity,
}: {
  contractor: ImportedContractor
  onActivity: (a: Activity) => void
}) {
  const [kind, setKind] = useState<TemplateKind>('email')
  const [templates, setTemplates] = useState<CRMTemplate[]>([])
  const [templateId, setTemplateId] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [senderEmail, setSenderEmail] = useState<string | null>(null)
  const [senderName, setSenderName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled || !session) return
      const email = session.user.email || null
      setSenderEmail(email)
      // Match the server's lookup order: profiles.full_name → email prefix.
      // (The server's env override CRM_SENDER_NAME can't be read here, so
      // the preview will diverge in that one case; sent output still wins.)
      const { data: prof } = await supabase
        .from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
      if (cancelled) return
      setSenderName(prof?.full_name || email?.split('@')[0] || null)
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    templatesAPI.list(kind)
      .then(({ items }) => { if (!cancelled) setTemplates(items) })
      .catch(() => {})
    setTemplateId(''); setSubject(''); setBody('')
    setError(null); setSuccess(null); setCopied(false)
    return () => { cancelled = true }
  }, [kind])

  // When the user picks a template, prefill the editable subject + body.
  useEffect(() => {
    if (!templateId) return
    const t = templates.find(x => x.id === templateId)
    if (!t) return
    setSubject(t.subject || '')
    setBody(t.body)
  }, [templateId, templates])

  const vars = useMemo(
    () => buildVars({ contractor, sender_email: senderEmail, sender_name: senderName }),
    [contractor, senderEmail, senderName],
  )
  const previewSubject = renderTemplate(subject, vars)
  const previewBody = renderTemplate(body, vars)

  const sendEmail = async () => {
    if (!contractor.email) { setError('This contractor has no email on file.'); return }
    if (!subject.trim() || !body.trim()) { setError('Subject and body are required.'); return }
    setBusy(true); setError(null); setSuccess(null)
    try {
      const { activity } = await sendAPI.email({
        contractor_id: contractor.id,
        subject, body,
      })
      onActivity(activity as Activity)
      setSuccess(`Email sent to ${contractor.email}`)
      setSubject(''); setBody(''); setTemplateId('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const copyDM = async () => {
    if (!body.trim()) { setError('Body is required.'); return }
    setBusy(true); setError(null); setSuccess(null)
    try {
      // Server renders, logs the activity, returns the final text.
      const { activity, rendered } = await sendAPI.dm({
        contractor_id: contractor.id, body,
      })
      await navigator.clipboard.writeText(rendered)
      setCopied(true)
      onActivity(activity as Activity)
      setSuccess('DM copied to clipboard and logged. Paste it in LinkedIn.')
      setTimeout(() => setCopied(false), 4000)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const isDNC = contractor.contact_status === 'do_not_contact'

  const tabBtn = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
      active ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <button type="button" onClick={() => setKind('email')} className={tabBtn(kind === 'email')}>
            <Mail size={14} /> Email
          </button>
          <button type="button" onClick={() => setKind('dm')} className={tabBtn(kind === 'dm')}>
            <MessageSquare size={14} /> LinkedIn DM
          </button>
        </div>
        <Link
          href="/crm/templates"
          className="text-[11px] font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
        >
          <Sparkles size={12} /> Manage templates
        </Link>
      </div>

      {isDNC && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
          <Ban size={14} className="shrink-0" />
          This contractor is marked <strong>DO NOT CONTACT</strong>. Sending is disabled — unmark them on their profile if you need to reach out.
        </div>
      )}

      {kind === 'email' && !contractor.email && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
          No email on file for this contractor. Add one above before sending.
        </div>
      )}

      <select
        value={templateId}
        onChange={(e) => setTemplateId(e.target.value)}
        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white"
      >
        <option value="">— Start from scratch —</option>
        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      {kind === 'email' && (
        <input
          value={subject} onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject — supports {{business_name}}, {{city}}, …"
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
        />
      )}

      <textarea
        value={body} onChange={(e) => setBody(e.target.value)}
        rows={kind === 'dm' ? 4 : 8}
        placeholder={
          kind === 'email'
            ? 'Hi {{business_name}} team, …'
            : 'Hey — saw your work in {{city}}…'
        }
        className="w-full text-sm font-mono px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
      />

      {(subject || body) && (
        <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
          <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-1">Preview</p>
          {kind === 'email' && previewSubject && (
            <p className="text-sm font-bold text-gray-900">{previewSubject}</p>
          )}
          <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{previewBody || <span className="text-gray-400">(empty)</span>}</p>
        </div>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}
      {success && <p className="text-xs text-emerald-700">{success}</p>}

      <div className="flex justify-end">
        {kind === 'email' ? (
          <button
            type="button" onClick={sendEmail} disabled={busy || !contractor.email || isDNC}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
          >
            <Send size={14} /> {busy ? 'Sending…' : `Send to ${contractor.email || '(no email)'}`}
          </button>
        ) : (
          <button
            type="button" onClick={copyDM} disabled={busy || isDNC}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {busy ? 'Working…' : copied ? 'Copied' : 'Copy & log DM'}
          </button>
        )}
      </div>
    </div>
  )
}
