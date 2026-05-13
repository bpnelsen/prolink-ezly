'use client'
import { useEffect, useState } from 'react'
import { X, Printer, Send, AlertCircle, FileSignature } from 'lucide-react'
import { apiFetch } from '../../lib/api-fetch'

interface Props {
  jobId: string
  open: boolean
  onClose: () => void
  /** Called after a contract is created (Print or Send). Receives the new contract id. */
  onCreated?: (contractId: string) => void
}

const inputCls = 'w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition'
const labelCls = 'block text-xs font-semibold text-gray-500 mb-1.5'

const initialForm = {
  contract_sum: '',
  start_date: '',
  substantial_completion_date: '',
  governing_law_state: 'UT',
  deposit_pct: '0.10',
  retainage_pct: '0.10',
  application_due_day: '25',
  payment_due_days: '10',
  late_interest_rate_annual: '0.08',
  dispute_method: 'mediation_then_arbitration',
}

export default function ContractFormModal({ jobId, open, onClose, onCreated }: Props) {
  const [form, setForm] = useState(initialForm)
  const [busy, setBusy] = useState<null | 'print' | 'send'>(null)
  const [error, setError] = useState<string | null>(null)

  // Reset whenever the modal closes
  useEffect(() => {
    if (!open) {
      setForm(initialForm)
      setError(null)
      setBusy(null)
    }
  }, [open])

  // Close on Esc
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const validate = (): string | null => {
    if (!form.contract_sum || isNaN(parseFloat(form.contract_sum))) return 'Contract Sum is required.'
    if (!form.start_date) return 'Start Date is required.'
    if (!form.substantial_completion_date) return 'Substantial Completion is required.'
    if (!form.governing_law_state) return 'Governing Law State is required.'
    return null
  }

  const createContract = async (): Promise<string | null> => {
    const v = validate()
    if (v) { setError(v); return null }
    setError(null)
    const body = {
      contract_sum: parseFloat(form.contract_sum),
      start_date: form.start_date,
      substantial_completion_date: form.substantial_completion_date,
      governing_law_state: form.governing_law_state,
      deposit_pct: parseFloat(form.deposit_pct),
      retainage_pct: parseFloat(form.retainage_pct),
      application_due_day: parseInt(form.application_due_day, 10),
      payment_due_days: parseInt(form.payment_due_days, 10),
      late_interest_rate_annual: parseFloat(form.late_interest_rate_annual),
      dispute_method: form.dispute_method,
    }
    const r = await apiFetch<{ id: string }>(`/api/v1/jobs/${jobId}/contract`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    if (r.status >= 400 || !r.data?.id) {
      setError(r.message || 'Failed to create contract.')
      return null
    }
    return r.data.id
  }

  const fetchContractPdfUrl = async (contractId: string): Promise<string | null> => {
    const r = await apiFetch<{ contract_versions: Array<{ version_number: number; pdf_url: string | null }>; current_version: number }>(`/api/v1/contracts/${contractId}`)
    if (!r.data) return null
    const v = r.data.contract_versions.find(x => x.version_number === r.data!.current_version)
    return v?.pdf_url || null
  }

  const handlePrint = async () => {
    setBusy('print')
    const id = await createContract()
    if (!id) { setBusy(null); return }
    const url = await fetchContractPdfUrl(id)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
    onCreated?.(id)
    setBusy(null)
    onClose()
  }

  const handleSend = async () => {
    setBusy('send')
    const id = await createContract()
    if (!id) { setBusy(null); return }
    const r = await apiFetch(`/api/v1/contracts/${id}/send`, { method: 'POST' })
    if (r.status >= 400) {
      setError(r.message || 'Contract created but send failed.')
      setBusy(null)
      onCreated?.(id)
      return
    }
    onCreated?.(id)
    setBusy(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-modal-title">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileSignature size={18} className="text-teal-600" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">New Contract</p>
              <h3 id="contract-modal-title" className="text-lg font-bold text-gray-900">
                Owner-Contractor Agreement
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Contract Sum (USD) *</label>
              <input className={inputCls} type="number" step="0.01" value={form.contract_sum}
                onChange={e => setForm({ ...form, contract_sum: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Governing Law State *</label>
              <input className={inputCls} value={form.governing_law_state}
                onChange={e => setForm({ ...form, governing_law_state: e.target.value.toUpperCase().slice(0, 2) })} />
            </div>
            <div>
              <label className={labelCls}>Start Date *</label>
              <input className={inputCls} type="date" value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Substantial Completion *</label>
              <input className={inputCls} type="date" value={form.substantial_completion_date}
                onChange={e => setForm({ ...form, substantial_completion_date: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Deposit %</label>
              <input className={inputCls} type="number" step="0.01" value={form.deposit_pct}
                onChange={e => setForm({ ...form, deposit_pct: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Retainage %</label>
              <input className={inputCls} type="number" step="0.01" value={form.retainage_pct}
                onChange={e => setForm({ ...form, retainage_pct: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Application Due Day</label>
              <input className={inputCls} type="number" value={form.application_due_day}
                onChange={e => setForm({ ...form, application_due_day: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Payment Due (days)</label>
              <input className={inputCls} type="number" value={form.payment_due_days}
                onChange={e => setForm({ ...form, payment_due_days: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Late Interest %/yr</label>
              <input className={inputCls} type="number" step="0.01" value={form.late_interest_rate_annual}
                onChange={e => setForm({ ...form, late_interest_rate_annual: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Dispute Method</label>
              <select className={inputCls} value={form.dispute_method}
                onChange={e => setForm({ ...form, dispute_method: e.target.value })}>
                <option value="mediation_then_arbitration">Mediation, then Arbitration</option>
                <option value="arbitration">Arbitration</option>
                <option value="litigation">Litigation</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-white">
            Cancel
          </button>
          <div className="flex gap-2">
            <button onClick={handlePrint} disabled={!!busy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-white disabled:opacity-50">
              <Printer size={14} /> {busy === 'print' ? 'Saving…' : 'Print Contract'}
            </button>
            <button onClick={handleSend} disabled={!!busy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold disabled:opacity-50">
              <Send size={14} /> {busy === 'send' ? 'Sending…' : 'Send Contract'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
