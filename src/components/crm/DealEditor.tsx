'use client'
import { useState } from 'react'
import { crmAPI, formatCurrencyCents } from '@/lib/crm-client'
import type { Deal, PipelineStage } from '@/lib/crm-types'
import { StageBadge } from './StageBadge'

export default function DealEditor({
  contractorId, deal, stages, onChange,
}: {
  contractorId: string
  deal: Deal | null
  stages: PipelineStage[]
  onChange: (d: Deal | null) => void
}) {
  const [editing, setEditing] = useState(!deal)
  const [stageKey, setStageKey] = useState(deal?.stage_key || 'new')
  const [valueDollars, setValueDollars] = useState(deal ? (deal.value_cents / 100).toString() : '')
  const [probability, setProbability] = useState(deal?.probability?.toString() || '10')
  const [closeDate, setCloseDate] = useState(deal?.expected_close_date || '')
  const [lostReason, setLostReason] = useState(deal?.lost_reason || '')
  const [owner, setOwner] = useState(deal?.owner_email || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stage = stages.find(s => s.key === stageKey)

  const save = async () => {
    setSaving(true); setError(null)
    try {
      const dollars = parseFloat(valueDollars || '0')
      const cents = Math.round((isNaN(dollars) ? 0 : dollars) * 100)
      const prob = Math.min(100, Math.max(0, parseInt(probability || '0', 10) || 0))
      const { deal: updated } = await crmAPI.deals.upsert(contractorId, {
        stage_key: stageKey,
        value_cents: cents,
        probability: prob,
        expected_close_date: closeDate || null,
        lost_reason: stage?.is_lost ? (lostReason || null) : null,
        owner_email: owner || null,
      } as Partial<Deal>)
      onChange(updated)
      setEditing(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const removeDeal = async () => {
    if (!deal) return
    if (!confirm('Remove this contractor from the pipeline?')) return
    setSaving(true); setError(null)
    try {
      await crmAPI.deals.remove(deal.id)
      onChange(null)
      setEditing(true)
      setStageKey('new'); setValueDollars(''); setProbability('10'); setCloseDate(''); setLostReason(''); setOwner('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Deal</h3>
        {deal && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-bold text-teal-700 hover:text-teal-800"
          >Edit</button>
        )}
      </div>

      {!editing && deal && (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Row label="Stage"><StageBadge stage={deal.stage_key} stages={stages} /></Row>
          <Row label="Value">{formatCurrencyCents(deal.value_cents)}</Row>
          <Row label="Probability">{deal.probability}%</Row>
          <Row label="Close date">{deal.expected_close_date || <span className="text-gray-400">—</span>}</Row>
          <Row label="Owner">{deal.owner_email || <span className="text-gray-400">—</span>}</Row>
          {deal.lost_reason && <Row label="Lost reason"><span className="text-rose-700">{deal.lost_reason}</span></Row>}
        </dl>
      )}

      {editing && (
        <div className="space-y-3">
          <Field label="Stage">
            <select
              value={stageKey} onChange={(e) => setStageKey(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg"
            >
              {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Value ($)">
              <input
                type="number" min="0" step="1"
                value={valueDollars} onChange={(e) => setValueDollars(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg"
              />
            </Field>
            <Field label="Probability (%)">
              <input
                type="number" min="0" max="100" step="5"
                value={probability} onChange={(e) => setProbability(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg"
              />
            </Field>
          </div>
          <Field label="Expected close date">
            <input
              type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg"
            />
          </Field>
          <Field label="Owner email">
            <input
              type="email" value={owner} onChange={(e) => setOwner(e.target.value)}
              placeholder="sales@useezly.com"
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg"
            />
          </Field>
          {stage?.is_lost && (
            <Field label="Lost reason">
              <input
                type="text" value={lostReason} onChange={(e) => setLostReason(e.target.value)}
                placeholder="Price, competitor, etc."
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg"
              />
            </Field>
          )}

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={save} disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-lg"
            >{saving ? 'Saving…' : (deal ? 'Save deal' : 'Create deal')}</button>
            {deal && (
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-bold px-4 py-2 rounded-lg"
              >Cancel</button>
            )}
            {deal && (
              <button
                onClick={removeDeal} disabled={saving}
                className="ml-auto text-xs font-bold text-rose-600 hover:text-rose-700"
              >Remove from pipeline</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{label}</dt>
      <dd className="text-gray-800">{children}</dd>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  )
}
