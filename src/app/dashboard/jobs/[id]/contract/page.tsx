'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, AlertCircle } from 'lucide-react'
import Breadcrumbs from '../../../../../components/Breadcrumbs'
import ContractDetail from '../../../../../components/contracts/ContractDetail'
import { apiFetch } from '../../../../../lib/api-fetch'
import { supabase } from '../../../../../lib/supabase-client'

interface ExistingContract { id: string }

const labelCls = 'block text-xs font-semibold text-gray-500 mb-1.5'
const inputCls = 'w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition'

export default function JobContractPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [contractId, setContractId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Generation form
  const [form, setForm] = useState({
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
  })

  const checkExisting = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    // Use the supabase client for a fast lookup (RLS scopes it to this contractor)
    const { data } = await supabase
      .from('contracts')
      .select('id')
      .eq('job_id', params.id)
      .neq('status', 'cancelled')
      .limit(1)
    const existing = data?.[0] as ExistingContract | undefined
    if (existing) setContractId(existing.id)
    setLoading(false)
  }, [params.id, router])

  useEffect(() => { checkExisting() }, [checkExisting])

  const generate = async () => {
    setError(null)
    setBusy(true)
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
    const r = await apiFetch<{ id: string }>(`/api/v1/jobs/${params.id}/contract`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    setBusy(false)
    if (r.status >= 400 || !r.data) {
      setError(r.message || 'Failed to generate contract.')
      return
    }
    setContractId(r.data.id)
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
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Jobs', href: '/dashboard/jobs' },
        { label: params.id.slice(0, 8), href: `/dashboard/jobs/${params.id}` },
        { label: 'Contract', href: `/dashboard/jobs/${params.id}/contract` },
      ]} />
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {contractId ? (
          <ContractDetail contractId={contractId} />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="text-teal-600" size={18} />
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Generate Contract</p>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Owner-Contractor Agreement</h2>
            <p className="text-sm text-gray-500 mb-6">Defaults match standard Prolink terms. Adjust before generating.</p>

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

            <button disabled={busy}
              onClick={generate}
              className="mt-6 w-full md:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm">
              {busy ? 'Generating…' : 'Generate Contract'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
