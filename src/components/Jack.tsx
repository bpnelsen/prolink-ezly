'use client'
import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Wrench, Loader2, Zap, AlertTriangle, FileText, MessageSquare, ChevronDown, History, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

const QUICK_PROMPTS = [
  { icon: AlertTriangle, label: 'Code compliance issue', prompt: 'I\'m at a job site and the local inspector flagged something. Help me understand the code requirement and how to resolve it quickly.' },
  { icon: FileText, label: 'Review a quote', prompt: 'Review this quote for a kitchen remodel. Does the scope and pricing look complete and profitable?' },
  { icon: Zap, label: 'Electrical question', prompt: 'I\'m working on a service panel upgrade and need to verify the wire sizing and breaker compatibility.' },
  { icon: MessageSquare, label: 'Customer dispute', prompt: 'A customer is pushing back on an additional charge for unforeseen work. Help me communicate this professionally.' },
]

// NOTE: Jack's system prompt lives server-side in /api/jack/route.ts.
// Keep it there as the single source of truth — the client only relays turns.

const GREETING = "⚡ Jack online.\n\nI'm your job-site partner — code questions, quote reviews, customer issues. What are we working on?"

type ChatMessage = { role: 'user' | 'ai'; content: string }

// Mirror of the server-side Proposal (see api/jack/tools.ts). The widget
// renders it as an Approve/Cancel card and echoes it back on approval.
type QuoteLine = { description: string; qty: number; unit: string; rate: number; amount: number }
type QuoteProposal = { type: 'create_quote' | 'update_quote'; summary: string; client_name: string; job_title: string | null; line_items: QuoteLine[]; subtotal: number; tax_rate: number; tax_amount: number; total: number; [k: string]: unknown }
type Proposal =
  | QuoteProposal
  | { type: 'create_customer'; summary: string; [k: string]: unknown }
  | { type: 'update_customer'; summary: string; changes?: Record<string, string>; [k: string]: unknown }
  | { type: 'create_job'; summary: string; [k: string]: unknown }
  | { type: 'schedule_job'; summary: string; [k: string]: unknown }
  | { type: 'add_material'; summary: string; [k: string]: unknown }

export default function Jack() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', content: GREETING }
  ])
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [jobContext, setJobContext] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [approving, setApproving] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch Business Context manually
  const fetchBusinessContext = async () => {
    setLoading(true);
    try {
      // Fetch top 3 active jobs
      const { data: pipelines } = await supabase
        .from('pl_pipelines')
        .select('project_name, stage, value')
        .eq('stage', 'Active')
        .limit(3)

      // Fetch summary counts
      const { count: leadCount } = await supabase
        .from('pl_pipelines')
        .select('*', { count: 'exact', head: true })
        .eq('stage', 'Lead')

      const summary = pipelines && pipelines.length > 0
        ? `Active Jobs (Top 3):\n${pipelines.map(p => `- ${p.project_name}: $${p.value}`).join('\n')}\n\nLeads waiting: ${leadCount || 0}`
        : 'No active jobs currently.';

      setJobContext(summary);
    } catch (e) {
        console.error("Jack context fetch error:", e);
    } finally {
        setLoading(false);
    }
  }

  // History button: pull the last 15 days of saved chat and drop it straight
  // into the panel, oldest -> newest, replacing the current session view.
  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessages([{ role: 'ai', content: 'Sign in to load your Jack history.' }])
        return
      }
      const resp = await fetch('/api/jack', {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await resp.json()
      const rows: ChatMessage[] = Array.isArray(data.messages)
        ? data.messages.map((m: { role: 'user' | 'ai'; content: string }) => ({ role: m.role, content: m.content }))
        : []
      setMessages(
        rows.length > 0
          ? [{ role: 'ai', content: '📜 Loaded your last 15 days of Jack history.' }, ...rows]
          : [{ role: 'ai', content: 'No Jack history in the last 15 days yet. Ask me something and it’ll be saved here.' }]
      )
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'Couldn’t load history right now. Try again in a moment.' }])
    } finally {
      setLoadingHistory(false)
    }
  }

  const sendToJack = async (prompt: string, includeContext: boolean = false) => {
    if (includeContext) {
        await fetchBusinessContext();
    }
    setInput(prompt)
    await handleSubmit(prompt)
  }

  const handleSubmit = async (promptOverride?: string) => {
    const text = promptOverride || input
    if (!text.trim()) return

    setInput('')
    // Capture prior turns for model memory before appending the new message.
    // Drop the canned greeting — it's UI filler, not real context.
    const priorTurns = messages.filter(m => m.content !== GREETING)
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessages(prev => [...prev, { role: 'ai', content: 'Sign in to chat with Jack.' }])
        return
      }
      const resp = await fetch('/api/jack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: text,
          context: jobContext || undefined,
          history: priorTurns,
        }),
      })
      if (resp.status === 429) {
        setMessages(prev => [...prev, { role: 'ai', content: 'Slow down — too many questions in a row. Try again in a minute.' }])
        return
      }
      const data = await resp.json()
      setMessages(prev => [...prev, { role: 'ai', content: data.response || 'Jack is off-site. Try again.' }])
      setProposal(data.proposal ?? null)
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'Jack is offline right now. Try again in a moment.' }])
    } finally {
      setLoading(false)
    }
  }

  // Approve a proposed action: write it for real via the action endpoint.
  const approveProposal = async () => {
    if (!proposal) return
    setApproving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessages(prev => [...prev, { role: 'ai', content: 'Sign in to save changes.' }])
        return
      }
      const resp = await fetch('/api/jack/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: proposal }),
      })
      const data = await resp.json()
      if (data.ok) {
        const link = data.link ? ` ${data.link}` : ''
        setMessages(prev => [...prev, { role: 'ai', content: `✅ ${data.message}${link}` }])
        setProposal(null)
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: `Couldn't save that: ${data.message || 'unknown error'}` }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'Couldn’t save that right now. Try again in a moment.' }])
    } finally {
      setApproving(false)
    }
  }

  const cancelProposal = () => {
    setProposal(null)
    setMessages(prev => [...prev, { role: 'ai', content: 'No problem — nothing saved. Want me to change anything?' }])
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#0f3a7d] text-white p-4 rounded-full shadow-2xl hover:bg-[#082860] transition-all flex items-center gap-2 group"
        >
          <Bot size={22} />
          <span className="text-sm font-bold pr-1">Jack</span>
        </button>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-88 flex flex-col overflow-hidden" style={{ width: 380, height: 520 }}>
          {/* Header */}
          <div className="bg-[#0f3a7d] text-white p-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm mb-0.5">
                <Wrench size={15} />
                Jack
              </div>
              <div className="flex items-center gap-2 mt-2">
                 <button
                   onClick={fetchBusinessContext}
                   className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md transition border border-white/10"
                 >
                   Refresh Data
                 </button>
                 <button
                   onClick={loadHistory}
                   disabled={loadingHistory}
                   className="text-[10px] bg-white/10 hover:bg-white/20 disabled:opacity-50 px-2 py-1 rounded-md transition border border-white/10 flex items-center gap-1"
                 >
                   {loadingHistory ? <Loader2 size={11} className="animate-spin" /> : <History size={11} />}
                   History
                 </button>
                 {jobContext && <span className="text-[10px] text-teal-400">Data Loaded</span>}
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded transition">
              <X size={16} />
            </button>
          </div>

          {jobContext && (
            <div className="bg-blue-900/50 p-3 text-[10px] text-blue-100 border-b border-white/5 whitespace-pre-line">
              <span className="font-bold flex items-center gap-1 mb-1 text-teal-400">
                Business Insight:
              </span>
              {jobContext}
            </div>
          )}

          {/* Quick prompts (collapsed by default) */}
          <div className="bg-gray-50 border-b border-gray-100">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs font-bold text-gray-500 hover:text-gray-700 transition"
            >
              <span>⚡ Quick Actions</span>
              <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && (
              <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                {QUICK_PROMPTS.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => sendToJack(qp.prompt)}
                    className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-600 hover:border-[#14b8a6] hover:text-teal-700 transition shadow-sm"
                  >
                    <qp.icon size={13} className="text-[#14b8a6] shrink-0" />
                    {qp.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i}>
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === 'ai'
                    ? 'bg-white border border-gray-200 shadow-sm text-gray-800'
                    : 'bg-[#0f3a7d] text-white ml-4'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-gray-400 text-xs pl-2">
                <Loader2 size={14} className="animate-spin" />
                Jack is thinking...
              </div>
            )}

            {proposal && (
              <div className="bg-white border-2 border-[#14b8a6] rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-teal-50 px-3 py-2 text-[11px] font-bold text-teal-800 border-b border-teal-100">
                  Approve to save · {proposal.summary}
                </div>
                {proposal.type === 'update_customer' && proposal.changes && (
                  <div className="p-3 text-[11px] text-gray-600 space-y-0.5">
                    {Object.entries(proposal.changes).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3">
                        <span className="text-gray-400 capitalize">{k.replace(/_/g, ' ')}</span>
                        <span className="font-medium text-gray-800 text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(proposal.type === 'create_quote' || proposal.type === 'update_quote') && (
                  <div className="p-3">
                    <div className="text-[11px] text-gray-500 mb-2">
                      <span className="font-semibold text-gray-700">{proposal.client_name}</span>
                      {proposal.job_title ? ` · ${proposal.job_title}` : ''}
                    </div>
                    <table className="w-full text-[10px] text-gray-700">
                      <thead>
                        <tr className="text-gray-400 text-left">
                          <th className="font-medium pb-1">Item</th>
                          <th className="font-medium pb-1 text-right">Qty</th>
                          <th className="font-medium pb-1 text-right">Rate</th>
                          <th className="font-medium pb-1 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposal.line_items.map((li, idx) => (
                          <tr key={idx} className="border-t border-gray-100">
                            <td className="py-1 pr-2">{li.description}</td>
                            <td className="py-1 text-right whitespace-nowrap">{li.qty} {li.unit}</td>
                            <td className="py-1 text-right whitespace-nowrap">${li.rate.toFixed(2)}</td>
                            <td className="py-1 text-right whitespace-nowrap">${li.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-600 space-y-0.5">
                      <div className="flex justify-between"><span>Subtotal</span><span>${proposal.subtotal.toFixed(2)}</span></div>
                      {proposal.tax_rate > 0 && (
                        <div className="flex justify-between"><span>Tax ({proposal.tax_rate}%)</span><span>${proposal.tax_amount.toFixed(2)}</span></div>
                      )}
                      <div className="flex justify-between font-bold text-gray-900 text-[11px]"><span>Total</span><span>${proposal.total.toFixed(2)}</span></div>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 p-3 pt-0">
                  <button
                    onClick={approveProposal}
                    disabled={approving}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#14b8a6] disabled:opacity-50 text-white text-xs font-bold py-2 rounded-xl hover:bg-[#0d9e8c] transition"
                  >
                    {approving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    Approve
                  </button>
                  <button
                    onClick={cancelProposal}
                    disabled={approving}
                    className="flex-1 bg-gray-100 disabled:opacity-50 text-gray-600 text-xs font-bold py-2 rounded-xl hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="p-3 border-t border-gray-100 bg-white flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your job site situation..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-[#14b8a6] transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#14b8a6] disabled:opacity-50 text-white p-2.5 rounded-xl hover:bg-[#0d9e8c] transition shadow-sm"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
