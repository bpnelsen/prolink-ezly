'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send } from 'lucide-react'
import { supabase } from '../../../../lib/supabase-client'
import { apiFetch } from '../../../../lib/api-fetch'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>
interface Message {
  id: string
  sender_role: 'contractor' | 'client' | 'system'
  sender_name: string | null
  body: string
  created_at: string
}

export default function PortalConversation({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [conv, setConv] = useState<Row | null>(null)
  const [biz, setBiz] = useState<Row>({})
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace(`/portal/login?next=/portal/conversations/${params.id}`); return }
    const r = await apiFetch<Row>(`/api/v1/portal/conversations/${params.id}`)
    if (r.data) {
      setConv(r.data.conversation || null)
      setBiz(r.data.business || {})
      setMessages(r.data.messages || [])
    }
    setLoading(false)
  }, [params.id, router])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [load])
  useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }) }, [messages])

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    const r = await apiFetch<Message>(`/api/v1/portal/conversations/${params.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: text }),
    })
    if (r.data) { setMessages(m => [...m, r.data as Message]); setDraft('') }
    else setError(r.message || r.error || 'Could not send.')
    setSending(false)
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="w-8 h-8 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin" /></div>
  }
  if (!conv) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-xl font-bold text-gray-900 mb-2">Conversation not found</p>
        <Link href="/portal" className="text-teal-600 text-sm font-semibold">← Back to portal</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={{ fontFamily: 'Arial, sans-serif' }}>
      <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3">
        <Link href="/portal" className="text-gray-500 hover:text-gray-800"><ArrowLeft size={16} /></Link>
        <div>
          <p className="text-sm font-bold text-gray-900">{biz.business_name || 'Your Contractor'}</p>
          {conv.jobs?.title && <p className="text-xs text-gray-500">{conv.jobs.title}</p>}
        </div>
      </header>

      <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3 max-w-2xl w-full mx-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No messages yet. Say hello.</p>
        ) : messages.map(m => (
          <div key={m.id} className={`flex ${m.sender_role === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
              m.sender_role === 'client' ? 'bg-teal-600 text-white'
                : m.sender_role === 'system' ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-white text-gray-800 border border-gray-200'}`}>
              <p className="text-[10px] font-semibold opacity-70 mb-0.5">
                {m.sender_role === 'client' ? 'You' : (m.sender_name || biz.business_name || 'Contractor')}
              </p>
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className="text-[10px] opacity-60 mt-1">
                {new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border-t border-gray-200 p-3">
        <div className="max-w-2xl mx-auto">
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              rows={2}
              placeholder="Type your message…"
              className="flex-1 resize-none bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
            />
            <button onClick={send} disabled={sending || !draft.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold">
              <Send size={13} /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
