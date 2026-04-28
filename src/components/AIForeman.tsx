'use client'
import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Wrench, Loader2 } from 'lucide-react'

export default function AIForeman() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: "I'm your Technical Foreman. Handling a tricky install, code issue, or site question? Ask me." }
  ])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const resp = await fetch('/api/foreman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg }),
      })
      const data = await resp.json()
      setMessages(prev => [...prev, { role: 'ai', content: data.response || 'System Error.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'Connection error. Check your API key.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-[#14b8a6] text-white p-4 rounded-full shadow-xl hover:bg-[#0d9e8c] transition-all"
        >
          <Bot size={24} />
        </button>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-80 h-96 flex flex-col overflow-hidden">
          <div className="bg-[#0f3a7d] text-white p-3 flex justify-between items-center text-sm font-bold">
            <span className="flex items-center gap-2"><Wrench size={16}/> Foreman AI</span>
            <button onClick={() => setIsOpen(false)}><X size={16}/></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`p-3 rounded-lg text-xs ${m.role === 'ai' ? 'bg-white border shadow-sm' : 'bg-[#0f3a7d] text-white ml-auto'}`}>
                {m.content}
              </div>
            ))}
            {loading && <div className="text-gray-400"><Loader2 className="animate-spin" size={16}/></div>}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-2 border-t flex gap-2">
            <input 
              value={input} onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-gray-100 rounded text-sm px-2 py-1 outline-none"
              placeholder="Ask code or tech..."
            />
            <button type="submit" className="bg-[#14b8a6] text-white p-2 rounded"><Send size={14}/></button>
          </form>
        </div>
      )}
    </div>
  )
}
