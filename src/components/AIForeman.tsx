'use client'
import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Wrench, Loader2, Zap, AlertTriangle, FileText, MessageSquare, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

const QUICK_PROMPTS = [
  { icon: AlertTriangle, label: 'Code compliance issue', prompt: 'I\'m at a job site and the local inspector flagged something. Help me understand the code requirement and how to resolve it quickly.' },
  { icon: FileText, label: 'Review a quote', prompt: 'Review this quote for a kitchen remodel. Does the scope and pricing look complete and profitable?' },
  { icon: Zap, label: 'Electrical question', prompt: 'I\'m working on a service panel upgrade and need to verify the wire sizing and breaker compatibility.' },
  { icon: MessageSquare, label: 'Customer dispute', prompt: 'A customer is pushing back on an additional charge for unforeseen work. Help me communicate this professionally.' },
]

const SYSTEM_PROMPT = `You are "Prolink Foreman" — a veteran construction foreman with 30+ years of hands-on experience in residential and light commercial trades (HVAC, plumbing, electrical, roofing, remodeling, and general contracting).

Your role: Be the contractor's trusted on-the-job advisor. When they're on a job site, stuck on a quoting decision, or dealing with a tricky customer situation — you're their silent partner with the answers.

Personality & tone:
- Calm, practical, no-nonsense — like a foreman who's seen everything twice
- Speak in plain contractor language, not jargon
- Always err on the side of safety and code compliance
- When uncertain, say "Based on what I can see..." and offer options

Your expertise covers:
- Building codes (IRC, NEC, UPC, local amendments)
- Trade best practices and material selection
- Job site safety (OSHA standards and practical safety)
- Scope-of-work writing and change order language
- Customer communication and de-escalation
- Material cost estimation (current market rates)
- Permit and inspection requirements
- Profit-margin advice for contractors

When a contractor asks about a specific job situation, always:
1. Acknowledge the situation first
2. Give a direct, actionable answer
3. Flag any code, safety, or liability concerns clearly
4. If the question is vague, ask for key details (address, trade, scope)

Do NOT:
- Make up specific code sections (cite general codes, not fictional section numbers)
- Be overly cautious to the point of being unhelpful
- Offer legal advice — always recommend they consult a licensed engineer or attorney for liability questions`

export default function AIForeman() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: "⚡ Prolink Foreman online.\n\nI'm your job-site partner — code questions, quote reviews, customer issues. What are we working on?" }
  ])
  const [loading, setLoading] = useState(false)
  const [jobContext, setJobContext] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
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
        console.error("Foreman context fetch error:", e);
    } finally {
        setLoading(false);
    }
  }

  const sendToForeman = async (prompt: string, includeContext: boolean = false) => {
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
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    const contextNote = jobContext ? `\n\n[CURRENT JOB CONTEXT]\n${jobContext}` : ''

    try {
      const resp = await fetch('/api/foreman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text + contextNote,
        }),
      })
      const data = await resp.json()
      setMessages(prev => [...prev, { role: 'ai', content: data.response || 'Foreman is off-site. Try again.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: '🔌 Foreman is offline. Check your OpenRouter API key in Vercel environment variables.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#0f3a7d] text-white p-4 rounded-full shadow-2xl hover:bg-[#082860] transition-all flex items-center gap-2 group"
        >
          <Bot size={22} />
          <span className="text-sm font-bold pr-1">Foreman AI</span>
        </button>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-88 flex flex-col overflow-hidden" style={{ width: 380, height: 520 }}>
          {/* Header */}
          <div className="bg-[#0f3a7d] text-white p-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm mb-0.5">
                <Wrench size={15} />
                Prolink Foreman AI
              </div>
              <div className="flex items-center gap-2 mt-2">
                 <button 
                   onClick={fetchBusinessContext}
                   className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md transition border border-white/10"
                 >
                   Refresh Data
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
                    onClick={() => sendToForeman(qp.prompt)}
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
                Foreman is thinking...
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