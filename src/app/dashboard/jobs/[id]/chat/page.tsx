'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Sparkles, Check, X, Link2, MessageSquare, RefreshCw } from 'lucide-react'
import Breadcrumbs from '../../../../../components/Breadcrumbs'
import { apiFetch } from '../../../../../lib/api-fetch'
import { supabase } from '../../../../../lib/supabase-client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

interface Message {
  id: string
  sender_role: 'contractor' | 'client' | 'system'
  sender_name: string | null
  body: string
  created_at: string
}

const SECTION_LABELS: Record<string, string> = {
  scope: 'Scope of Work',
  pricing: 'Pricing & Money',
  schedule: 'Schedule & Dates',
  decisions: 'Decisions & Open Questions',
  action_items: 'Action Items',
  change_order_opportunities: 'Change Order Opportunities',
  value_engineering: 'Value Engineering',
  upgrade_opportunities: 'Upgrade Opportunities',
}
const SECTION_ORDER = Object.keys(SECTION_LABELS)

export default function JobChatPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [convId, setConvId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [jobTitle, setJobTitle] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [dealPlan, setDealPlan] = useState<Row | null>(null)
  const [suggestions, setSuggestions] = useState<Row[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const analyzingRef = useRef(false)
  const threadRef = useRef<HTMLDivElement>(null)

  const applySnapshot = useCallback((d: Row) => {
    if (d.conversation) {
      setConvId(d.conversation.id)
      setToken(d.conversation.public_token)
    }
    if (d.job?.title) setJobTitle(d.job.title)
    if (d.deal_plan) setDealPlan(d.deal_plan)
    setMessages(d.messages || [])
    setSuggestions(d.suggestions || [])
    return d
  }, [])

  const runAnalyze = useCallback(async (cid: string) => {
    if (analyzingRef.current) return
    analyzingRef.current = true
    setAnalyzing(true)
    const a = await apiFetch<Row>(`/api/v1/conversations/${cid}/analyze`, { method: 'POST' })
    if (a.status >= 400) {
      setError(`AI analysis failed (HTTP ${a.status}): ${a.message || a.error || 'unknown error'}`)
    } else if (a.data?.warning) {
      setError(`AI analysis: ${a.data.warning}`)
    }
    const r = await apiFetch<Row>(`/api/v1/conversations/${cid}/messages`)
    if (r.data) applySnapshot(r.data)
    analyzingRef.current = false
    setAnalyzing(false)
  }, [applySnapshot])

  const poll = useCallback(async (cid: string) => {
    const r = await apiFetch<Row>(`/api/v1/conversations/${cid}/messages`)
    if (!r.data) return
    applySnapshot(r.data)
    const conv = r.data.conversation
    const msgs: Message[] = r.data.messages || []
    const lastClient = [...msgs].reverse().find(m => m.sender_role === 'client')
    const needs =
      lastClient &&
      conv?.last_message_at &&
      (!conv.last_analyzed_at || new Date(conv.last_message_at) > new Date(conv.last_analyzed_at))
    if (needs) runAnalyze(cid)
  }, [applySnapshot, runAnalyze])

  const init = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    const r = await apiFetch<Row>(`/api/v1/jobs/${params.id}/conversation`)
    if (r.data) {
      applySnapshot(r.data)
      setError(null)
    } else {
      setError(
        `Couldn't load this conversation (HTTP ${r.status}): ${r.message || r.error || 'unknown error'}. ` +
        `If this mentions a missing relation/table or function, the chat database migration ` +
        `(migrations/014_chat_and_deal_plan.sql) has not been applied in Supabase yet.`
      )
    }
    setLoading(false)
  }, [params.id, router, applySnapshot])

  useEffect(() => { init() }, [init])

  useEffect(() => {
    if (!convId) return
    const t = setInterval(() => poll(convId), 5000)
    return () => clearInterval(t)
  }, [convId, poll])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [messages])

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    if (!convId) {
      setError('Cannot send: the conversation never loaded. See the error above (likely the chat migration is not applied in Supabase).')
      return
    }
    setSending(true)
    const r = await apiFetch<Message>(`/api/v1/conversations/${convId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: text }),
    })
    if (r.data) {
      setMessages(m => [...m, r.data as Message])
      setDraft('')
      setError(null)
    } else {
      setError(`Message failed (HTTP ${r.status}): ${r.message || r.error || 'unknown error'}`)
    }
    setSending(false)
  }

  const decide = async (id: string, action: 'accept' | 'reject') => {
    const r = await apiFetch<Row>(`/api/v1/deal-plan/suggestions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    })
    if (r.status < 400) {
      setSuggestions(s => s.filter(x => x.id !== id))
      if (action === 'accept' && r.data?.deal_plan) setDealPlan(r.data.deal_plan)
    }
  }

  const copyLink = () => {
    if (!token) return
    navigator.clipboard.writeText(`${window.location.origin}/chat/${token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[
        { label: 'Jobs', href: '/dashboard/jobs' },
        { label: jobTitle || 'Job', href: `/dashboard/jobs/${params.id}` },
        { label: 'Chat & Deal Plan', href: `/dashboard/jobs/${params.id}/chat` },
      ]} />

      {error && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm whitespace-pre-wrap">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chat */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[75vh]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <MessageSquare size={15} className="text-teal-600" />
              <p className="text-sm font-bold text-gray-900">Client Chat</p>
            </div>
            <button onClick={copyLink}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800">
              <Link2 size={12} /> {copied ? 'Link copied!' : 'Copy client link'}
            </button>
          </div>

          <div ref={threadRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">
                No messages yet. Send the client their link to start the conversation.
              </p>
            ) : messages.map(m => (
              <div key={m.id} className={`flex ${m.sender_role === 'contractor' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                  m.sender_role === 'contractor'
                    ? 'bg-teal-600 text-white'
                    : m.sender_role === 'system'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-gray-100 text-gray-800'
                }`}>
                  <p className="text-[10px] font-semibold opacity-70 mb-0.5">
                    {m.sender_name || (m.sender_role === 'contractor' ? 'You' : 'Client')}
                  </p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="text-[10px] opacity-60 mt-1">
                    {new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 p-3 flex items-end gap-2">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              rows={2}
              placeholder="Message your client…"
              className="flex-1 resize-none bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
            />
            <button onClick={send} disabled={sending || !draft.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold">
              <Send size={13} /> Send
            </button>
          </div>
        </div>

        {/* Deal plan + AI suggestions */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-purple-600" />
                <p className="text-sm font-bold text-gray-900">AI Suggestions</p>
                {suggestions.length > 0 && (
                  <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    {suggestions.length} pending
                  </span>
                )}
              </div>
              <button onClick={() => convId && runAnalyze(convId)} disabled={analyzing}
                className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-800 disabled:opacity-50">
                <RefreshCw size={12} className={analyzing ? 'animate-spin' : ''} />
                {analyzing ? 'Analyzing…' : 'Re-analyze'}
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[40vh] overflow-y-auto">
              {suggestions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  No pending suggestions. The AI reviews the conversation as it grows.
                </p>
              ) : suggestions.map(s => (
                <div key={s.id} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      {SECTION_LABELS[s.section] || s.section}
                    </span>
                    <div className="flex gap-1.5">
                      <button onClick={() => decide(s.id, 'accept')}
                        className="flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-800">
                        <Check size={13} /> Accept
                      </button>
                      <button onClick={() => decide(s.id, 'reject')}
                        className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-red-600">
                        <X size={13} /> Reject
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{s.payload?.title || '(untitled)'}</p>
                  {s.payload?.detail && <p className="text-sm text-gray-600 mt-0.5">{s.payload.detail}</p>}
                  {(s.payload?.amount != null || s.payload?.due_date) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {s.payload?.amount != null && <span className="mr-3">Amount: ${Number(s.payload.amount).toLocaleString()}</span>}
                      {s.payload?.due_date && <span>Due: {s.payload.due_date}</span>}
                    </p>
                  )}
                  {s.rationale && <p className="text-xs text-gray-400 mt-1.5 italic">Why: {s.rationale}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">Deal Plan</p>
              <p className="text-[11px] text-gray-400">Accepted items only — your single source of truth for this job.</p>
            </div>
            <div className="p-4 space-y-4 max-h-[40vh] overflow-y-auto">
              {SECTION_ORDER.every(k => !(dealPlan?.[k]?.length)) ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  Nothing here yet. Accept AI suggestions to build the plan.
                </p>
              ) : SECTION_ORDER.map(k => {
                const items: Row[] = dealPlan?.[k] || []
                if (!items.length) return null
                return (
                  <div key={k}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                      {SECTION_LABELS[k]}
                    </p>
                    <ul className="space-y-1.5">
                      {items.map((it, i) => (
                        <li key={i} className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2">
                          <span className="font-semibold">{it.title || '(item)'}</span>
                          {it.detail && <span className="text-gray-600"> — {it.detail}</span>}
                          {(it.amount != null || it.due_date) && (
                            <span className="block text-xs text-gray-500 mt-0.5">
                              {it.amount != null && <span className="mr-3">${Number(it.amount).toLocaleString()}</span>}
                              {it.due_date && <span>Due {it.due_date}</span>}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
