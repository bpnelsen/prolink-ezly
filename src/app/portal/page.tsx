'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, MessageSquare, FileSignature, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase-client'
import { apiFetch } from '../../lib/api-fetch'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>
type Tab = 'invoices' | 'messages' | 'contracts'

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

  const signOut = async () => {
    await supabase.auth.signOut()
    router.replace('/portal/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  const businesses: Record<string, string> = data?.businesses || {}
  const invoices: Row[] = data?.invoices || []
  const conversations: Row[] = data?.conversations || []
  const contracts: Row[] = data?.contracts || []
  const linked = data?.linked

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: 'Arial, sans-serif' }}>
      <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900">Customer Portal</p>
        <button onClick={signOut} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800">
          <LogOut size={13} /> Sign out
        </button>
      </header>

      <div className="max-w-3xl mx-auto p-4 md:p-6">
        {!linked ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-4xl mb-3">🔗</p>
            <h1 className="text-lg font-bold text-gray-900 mb-1">No records linked yet</h1>
            <p className="text-sm text-gray-500">
              Open the portal invite link your contractor sent you to connect your account.
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              {([
                ['invoices', `Invoices (${invoices.length})`, <FileText key="i" size={13} />],
                ['messages', `Messages (${conversations.length})`, <MessageSquare key="m" size={13} />],
                ['contracts', `Contracts (${contracts.length})`, <FileSignature key="c" size={13} />],
              ] as const).map(([id, label, icon]) => (
                <button key={id} onClick={() => setTab(id as Tab)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    tab === id ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}>
                  {icon} {label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
              {tab === 'invoices' && (invoices.length === 0 ? (
                <Empty text="No invoices yet." />
              ) : invoices.map(i => (
                <Link key={i.id} href={`/portal/invoices/${i.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Invoice {i.invoice_number}</p>
                    <p className="text-xs text-gray-400">
                      {businesses[i.contractor_id] || 'Contractor'} · {i.status}
                      {i.issue_date ? ` · ${new Date(i.issue_date).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">${Number(i.total).toFixed(2)}</p>
                    {Number(i.balance_due) > 0
                      ? <p className="text-xs font-semibold text-orange-600">${Number(i.balance_due).toFixed(2)} due</p>
                      : <p className="text-xs font-semibold text-green-600">Paid</p>}
                  </div>
                </Link>
              )))}

              {tab === 'messages' && (conversations.length === 0 ? (
                <Empty text="No conversations yet." />
              ) : conversations.map(c => (
                <Link key={c.id} href={`/portal/conversations/${c.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{c.jobs?.title || 'Conversation'}</p>
                    <p className="text-xs text-gray-400">{businesses[c.contractor_id] || 'Contractor'}</p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : ''}
                  </p>
                </Link>
              )))}

              {tab === 'contracts' && (contracts.length === 0 ? (
                <Empty text="No contracts yet." />
              ) : contracts.map(c => (
                <Link key={c.id} href={`/portal/contracts/${c.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Contract {c.contract_number}</p>
                    <p className="text-xs text-gray-400">{businesses[c.contractor_id] || 'Contractor'} · {c.status}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">${Number(c.contract_sum).toLocaleString()}</p>
                </Link>
              )))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 text-center py-10">{text}</p>
}
