'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'
import { supabase } from '../../../lib/supabase-client'

interface Message {
  id: string
  sender_role: 'contractor' | 'client' | 'system'
  sender_name: string | null
  body: string
  created_at: string
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conv = Record<string, any>

export default function ClientChatPage({ params }: { params: { token: string } }) {
  const { token } = params
  const [loading, setLoading] = useState(true)
  const [conv, setConv] = useState<Conv | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const { data, error: rpcErr } = await supabase.rpc('get_client_thread', { p_token: token })
    if (rpcErr) {
      setLoadErr(rpcErr.message || 'Could not load this conversation.')
    } else if (data) {
      setConv((data as Conv).conversation || null)
      setMessages(((data as Conv).messages as Message[]) || [])
      setLoadErr(null)
    }
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [messages])

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    const { data, error: rpcErr } = await supabase.rpc('post_client_message', {
      p_token: token,
      p_body: text,
    })
    const res = data as Conv | null
    if (rpcErr || !res?.ok) {
      const code = res?.error
      setError(
        code === 'too_long' ? 'Message is too long.'
          : code === 'rate_limited' ? 'You are sending messages too quickly. Please wait a moment.'
          : code === 'not_found' ? 'This conversation is no longer available.'
          : 'Could not send. Please try again.'
      )
    } else {
      setMessages(m => [...m, res.message as Message])
      setDraft('')
    }
    setSending(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!conv) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-4xl mb-4">💬</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Conversation not found</h1>
        <p className="text-gray-500 text-sm">This link may be invalid or no longer active.</p>
        {loadErr && (
          <p className="mt-4 max-w-md text-xs text-red-600 break-words">{loadErr}</p>
        )}
      </div>
    )
  }

  const biz = conv.business || {}
  const jobTitle = conv.job?.title || ''

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={{ fontFamily: 'Arial, sans-serif' }}>
      <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3">
        {biz.logo_url && (
          <img src={biz.logo_url} alt="logo" className="w-9 h-9 rounded-full object-cover border border-gray-100" />
        )}
        <div>
          <p className="text-sm font-bold text-gray-900">{biz.business_name || 'Your Contractor'}</p>
          {jobTitle && <p className="text-xs text-gray-500">{jobTitle}</p>}
        </div>
      </header>

      <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3 max-w-2xl w-full mx-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            Send a message to start the conversation.
          </p>
        ) : messages.map(m => (
          <div key={m.id} className={`flex ${m.sender_role === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
              m.sender_role === 'client'
                ? 'bg-teal-600 text-white'
                : m.sender_role === 'system'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-white text-gray-800 border border-gray-200'
            }`}>
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
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Powered by Prolink by EZLY
          </p>
        </div>
      </div>
    </div>
  )
}
