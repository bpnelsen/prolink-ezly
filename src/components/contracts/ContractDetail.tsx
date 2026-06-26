'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Download, Send, FileSignature, Upload, CheckCircle2, AlertCircle, Plus, Edit2 } from 'lucide-react'
import { apiFetch } from '../../lib/api-fetch'

type Status = 'draft' | 'sent' | 'partially_signed' | 'executed' | 'cancelled'

interface Signature {
  id: string
  signer_role: 'owner' | 'contractor'
  signer_name: string
  signed_at: string | null
  ip_address: string | null
}

interface Version {
  id: string
  version_number: number
  reason: string
  pdf_url: string | null
  signed_pdf_url: string | null
  created_at: string
}

interface ChangeOrder {
  id: string
  co_number: string
  description: string
  amount_delta: number
  status: string
  created_at: string
}

interface Contract {
  id: string
  contract_number: string
  status: Status
  contract_sum: number
  deposit_pct: number
  retainage_pct: number
  start_date: string | null
  substantial_completion_date: string | null
  governing_law_state: string | null
  dispute_method: string
  current_version: number
  sent_at: string | null
  executed_at: string | null
  contract_signatures: Signature[]
  contract_versions: Version[]
  change_orders: ChangeOrder[]
  clients: { first_name: string; last_name: string; email: string | null } | null
  jobs: { title: string } | null
}

const FLAG = process.env.NEXT_PUBLIC_SIGNWELL_ENABLED === 'true'

export default function ContractDetail({ contractId }: { contractId: string }) {
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const r = await apiFetch<Contract>(`/api/v1/contracts/${contractId}`)
    if (r.data) setContract(r.data)
    else setError(r.message || 'Failed to load contract')
    setLoading(false)
  }, [contractId])

  useEffect(() => { load() }, [load])

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label)
    setError(null)
    try { await fn() } catch (e) { setError(String(e)) }
    setBusy(null)
  }

  if (loading) return <div className="p-12 text-center text-gray-500">Loading contract…</div>
  if (!contract) return <div className="p-12 text-center text-red-600">{error || 'Contract not found.'}</div>

  const ownerSig = contract.contract_signatures.find(s => s.signer_role === 'owner')
  const contractorSig = contract.contract_signatures.find(s => s.signer_role === 'contractor')
  const currentVersion = contract.contract_versions.find(v => v.version_number === contract.current_version)
  const isDraft = contract.status === 'draft'
  const isInFlight = contract.status === 'sent' || contract.status === 'partially_signed'
  const isExecuted = contract.status === 'executed'

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Summary card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Contract</p>
            <h2 className="text-2xl font-bold text-gray-900">{contract.contract_number}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {contract.jobs?.title || 'Project'} ·{' '}
              {contract.clients ? `${contract.clients.first_name} ${contract.clients.last_name}` : 'No client'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Contract Sum</p>
            <p className="text-2xl font-bold text-teal-700">
              ${Number(contract.contract_sum).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">Status: <span className="font-semibold text-gray-800">{contract.status}</span></p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <button
              disabled={!!busy}
              onClick={() => run('send', async () => {
                const r = await apiFetch(`/api/v1/contracts/${contract.id}/send`, { method: 'POST' })
                if (r.status >= 400) throw new Error(r.message || 'Send failed')
                await load()
              })}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold disabled:opacity-50">
              <Send size={14} /> {FLAG ? 'Send for E-Signature' : 'Send to Owner'}
            </button>
          )}
          {currentVersion?.pdf_url && (
            <a href={`/api/v1/contracts/${contract.id}/pdf`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-semibold text-gray-700">
              <Download size={14} /> Download PDF
            </a>
          )}
          {isDraft && (
            <button
              disabled={!!busy}
              onClick={() => run('render', async () => {
                const r = await apiFetch(`/api/v1/contracts/${contract.id}/render`, { method: 'POST' })
                if (r.status >= 400) throw new Error(r.message || 'Re-render failed')
                await load()
              })}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-semibold text-gray-700">
              <Edit2 size={14} /> Re-render
            </button>
          )}
        </div>
      </div>

      {/* Signing panel */}
      {isInFlight && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileSignature size={16} className="text-purple-600" />
              Manual Signing
            </h3>
            {FLAG && (
              <span className="text-xs text-gray-500">SignWell active · this is the fallback</span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-4">
            {[ownerSig, contractorSig].map((sig, idx) => {
              const role = idx === 0 ? 'owner' : 'contractor'
              const signed = !!sig?.signed_at
              return (
                <div key={role} className={`rounded-xl border p-3 ${signed ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{role}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{sig?.signer_name || '—'}</p>
                  {signed ? (
                    <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Signed {new Date(sig!.signed_at!).toLocaleString()}
                    </p>
                  ) : (
                    <button
                      disabled={!!busy}
                      onClick={() => run('mark-' + role, async () => {
                        const r = await apiFetch(`/api/v1/contracts/${contract.id}/mark-signed`, {
                          method: 'POST',
                          body: JSON.stringify({ signer_role: role }),
                        })
                        if (r.status >= 400) throw new Error(r.message || 'Mark failed')
                        await load()
                      })}
                      className="mt-2 text-xs font-semibold text-teal-700 hover:underline">
                      Mark {role} as signed
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
              onChange={async e => {
                const file = e.target.files?.[0]
                if (!file) return
                await run('upload', async () => {
                  const fd = new FormData()
                  fd.append('file', file)
                  const r = await apiFetch(`/api/v1/contracts/${contract.id}/upload-signed-pdf`, { method: 'POST', body: fd })
                  if (r.status >= 400) throw new Error(r.message || 'Upload failed')
                  await load()
                })
                if (fileRef.current) fileRef.current.value = ''
              }} />
            <button
              disabled={!!busy}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-semibold text-gray-700">
              <Upload size={14} /> Upload Signed PDF
            </button>
            <button
              disabled={!!busy || !(ownerSig?.signed_at && contractorSig?.signed_at)}
              onClick={() => run('execute', async () => {
                const r = await apiFetch(`/api/v1/contracts/${contract.id}/mark-executed`, { method: 'POST' })
                if (r.status >= 400) throw new Error(r.message || 'Execute failed')
                await load()
              })}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-sm font-bold">
              <CheckCircle2 size={14} /> Mark Contract Executed
            </button>
          </div>
        </div>
      )}

      {/* Executed audit */}
      {isExecuted && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <h3 className="text-base font-bold text-green-800 mb-2 flex items-center gap-2">
            <CheckCircle2 size={16} /> Executed
          </h3>
          <ul className="text-sm text-green-800 space-y-1">
            {contract.contract_signatures.map(s => (
              <li key={s.id}>
                <span className="font-semibold capitalize">{s.signer_role}</span> · {s.signer_name} ·{' '}
                {s.signed_at ? new Date(s.signed_at).toLocaleString() : 'unsigned'}
                {s.ip_address ? ` · ${s.ip_address}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview */}
      {currentVersion?.pdf_url && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">Preview · v{contract.current_version}</p>
            <p className="text-xs text-gray-500">Print from the preview to save as PDF.</p>
          </div>
          <iframe src={`/api/v1/contracts/${contract.id}/pdf?v=${contract.current_version}`} className="w-full" style={{ height: '900px', border: 0 }} title="Contract preview" />
        </div>
      )}

      {/* Change orders */}
      {isExecuted && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900">Change Orders</h3>
            <button
              disabled={!!busy}
              onClick={() => run('co-create', async () => {
                const desc = window.prompt('Describe the change:')
                if (!desc) return
                const amt = parseFloat(window.prompt('Amount delta (USD, can be negative):') || '0') || 0
                const days = parseInt(window.prompt('Time delta in days:') || '0', 10) || 0
                const r = await apiFetch(`/api/v1/contracts/${contract.id}/change-orders`, {
                  method: 'POST',
                  body: JSON.stringify({ description: desc, amount_delta: amt, time_delta_days: days }),
                })
                if (r.status >= 400) throw new Error(r.message || 'CO create failed')
                await load()
              })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold">
              <Plus size={12} /> New Change Order
            </button>
          </div>
          {contract.change_orders.length === 0 ? (
            <p className="text-sm text-gray-500">No change orders yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {contract.change_orders.map(co => (
                <li key={co.id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold text-gray-900">{co.co_number}</span>
                    <span className="text-gray-500 ml-2">{co.description}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={Number(co.amount_delta) >= 0 ? 'text-teal-700 font-semibold' : 'text-red-700 font-semibold'}>
                      {Number(co.amount_delta) >= 0 ? '+' : ''}${Number(co.amount_delta).toFixed(2)}
                    </span>
                    <span className="text-xs uppercase font-semibold text-gray-400">{co.status}</span>
                    {co.status === 'draft' && (
                      <button
                        onClick={() => run('co-send-' + co.id, async () => {
                          const r = await apiFetch(`/api/v1/change-orders/${co.id}/send`, { method: 'POST' })
                          if (r.status >= 400) throw new Error(r.message || 'Send CO failed')
                          await load()
                        })}
                        className="text-xs text-teal-700 hover:underline">Send</button>
                    )}
                    {co.status === 'sent' && (
                      <button
                        onClick={() => run('co-exec-' + co.id, async () => {
                          const r = await apiFetch(`/api/v1/change-orders/${co.id}/mark-executed`, { method: 'POST' })
                          if (r.status >= 400) throw new Error(r.message || 'Execute CO failed')
                          await load()
                        })}
                        className="text-xs text-purple-700 hover:underline">Mark Executed</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Versions tab */}
      {contract.contract_versions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-base font-bold text-gray-900 mb-3">Version History</h3>
          <ul className="divide-y divide-gray-100">
            {contract.contract_versions.map(v => (
              <li key={v.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <span className="font-semibold text-gray-900">v{v.version_number}</span>
                  <span className="text-gray-500 ml-2 capitalize">{v.reason.replace(/_/g, ' ')}</span>
                  <span className="text-gray-400 ml-2 text-xs">{new Date(v.created_at).toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  {v.pdf_url && <a href={`/api/v1/contracts/${contract.id}/pdf?v=${v.version_number}`} target="_blank" rel="noreferrer" className="text-xs text-teal-700 hover:underline">Unsigned</a>}
                  {v.signed_pdf_url && <a href={v.signed_pdf_url} target="_blank" rel="noreferrer" className="text-xs text-purple-700 hover:underline">Signed</a>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
