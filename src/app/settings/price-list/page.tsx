'use client'
import { useEffect, useState, useCallback } from 'react'
import { ListChecks, Plus, Trash2, Pencil, Check, X, Loader2, Sparkles } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import { supabase } from '@/lib/supabase-client'

type Material = {
  id: string
  name: string
  category: string | null
  unit: string
  unit_cost: number | null
  unit_price: number
}

const UNITS = ['ea', 'hr', 'sqft', 'lft', 'day', 'lot']
const emptyDraft = { name: '', category: '', unit: 'ea', unit_cost: '', unit_price: '' }
type Draft = typeof emptyDraft

const money = (n: number | null) => (n == null ? '—' : `$${Number(n).toFixed(2)}`)

export default function PriceListPage() {
  const [items, setItems] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Draft>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft)
  const [refilling, setRefilling] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Please sign in to manage your price list.'); setLoading(false); return }
    const { data, error: err } = await supabase
      .from('materials')
      .select('id, name, category, unit, unit_cost, unit_price')
      .eq('is_active', true)
      .order('name')
    if (err) setError('Could not load your price list.')
    else setItems((data ?? []) as Material[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const draftToRow = (d: Draft) => {
    const price = parseFloat(d.unit_price)
    if (!d.name.trim() || !Number.isFinite(price)) return null
    const cost = parseFloat(d.unit_cost)
    return {
      name: d.name.trim().slice(0, 200),
      category: d.category.trim() || null,
      unit: UNITS.includes(d.unit) ? d.unit : 'ea',
      unit_price: Math.round(price * 100) / 100,
      unit_cost: Number.isFinite(cost) ? Math.round(cost * 100) / 100 : null,
    }
  }

  const addItem = async () => {
    const row = draftToRow(form)
    if (!row) { setError('A name and price are required.'); return }
    setSaving(true); setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Please sign in.'); setSaving(false); return }
    const { error: err } = await supabase.from('materials').insert({ ...row, contractor_id: session.user.id })
    setSaving(false)
    if (err) { setError('Could not save that item.'); return }
    setForm(emptyDraft)
    load()
  }

  const startEdit = (m: Material) => {
    setEditingId(m.id)
    setEditDraft({
      name: m.name,
      category: m.category ?? '',
      unit: m.unit,
      unit_cost: m.unit_cost == null ? '' : String(m.unit_cost),
      unit_price: String(m.unit_price),
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    const row = draftToRow(editDraft)
    if (!row) { setError('A name and price are required.'); return }
    setSaving(true); setError(null)
    const { error: err } = await supabase.from('materials').update({ ...row, updated_at: new Date().toISOString() }).eq('id', editingId)
    setSaving(false)
    if (err) { setError('Could not update that item.'); return }
    setEditingId(null)
    load()
  }

  const refillFromHistory = async () => {
    setRefilling(true); setError(null); setNotice(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Please sign in.'); setRefilling(false); return }
    try {
      const resp = await fetch('/api/materials/refill', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await resp.json()
      if (data.ok) {
        setNotice(data.added > 0
          ? `Added ${data.added} item${data.added > 1 ? 's' : ''} from your past quotes.`
          : 'Your price book already covers your past quotes — nothing to add.')
        if (data.added > 0) await load()
      } else {
        setError(data.message || 'Could not refill the price book.')
      }
    } catch {
      setError('Could not refill the price book. Try again in a moment.')
    } finally {
      setRefilling(false)
    }
  }

  const remove = async (id: string) => {
    setSaving(true)
    const { error: err } = await supabase.from('materials').delete().eq('id', id)
    setSaving(false)
    if (err) { setError('Could not delete that item.'); return }
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const fieldCls = 'border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-800 outline-none focus:border-teal-500 transition'

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Price Book', href: '/settings/price-list' }]} />
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Settings</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <ListChecks size={22} className="text-teal-600" /> Price Book
        </h2>
        <p className="text-gray-500 text-sm mb-5">
          Your standard prices for materials and labor. These feed your quotes — and the Jack assistant uses them so quotes match how you price.
        </p>

        <div className="mb-6">
          <button
            onClick={refillFromHistory}
            disabled={refilling}
            className="inline-flex items-center gap-2 bg-gray-900 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-gray-800 transition shadow-sm"
          >
            {refilling ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} className="text-teal-400" />}
            Refill from past quotes
          </button>
          <p className="text-xs text-gray-400 mt-1.5">Pulls items you&apos;ve quoted before (most recent price) and adds any that aren&apos;t here yet.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium">{error}</div>
        )}
        {notice && (
          <div className="mb-6 p-4 bg-teal-50 text-teal-700 rounded-xl text-sm font-medium">{notice}</div>
        )}

        {/* Add new item */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
          <p className="text-sm font-bold text-gray-900 mb-3">Add an item</p>
          <div className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center">
            <input className={`${fieldCls} col-span-2 md:col-span-4`} placeholder="Item name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className={`${fieldCls} col-span-1 md:col-span-2`} placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            <select className={`${fieldCls} col-span-1 md:col-span-2`} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <input className={`${fieldCls} col-span-1 md:col-span-1`} placeholder="Cost" inputMode="decimal" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} />
            <input className={`${fieldCls} col-span-1 md:col-span-2`} placeholder="Price *" inputMode="decimal" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} />
            <button
              onClick={addItem}
              disabled={saving}
              className="col-span-2 md:col-span-1 bg-teal-600 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-sm font-bold hover:bg-teal-700 transition flex items-center justify-center"
              aria-label="Add item"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 flex items-center justify-center text-gray-400 text-sm gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No items yet. Add your common materials and labor rates above — Jack will use them when building quotes.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Unit</th>
                  <th className="px-3 py-3 font-semibold text-right">Cost</th>
                  <th className="px-3 py-3 font-semibold text-right">Price</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(m => editingId === m.id ? (
                  <tr key={m.id} className="border-b border-gray-50 bg-teal-50/30">
                    <td className="px-4 py-2"><input className={`${fieldCls} w-full`} value={editDraft.name} onChange={e => setEditDraft({ ...editDraft, name: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className={`${fieldCls} w-full`} value={editDraft.category} onChange={e => setEditDraft({ ...editDraft, category: e.target.value })} /></td>
                    <td className="px-3 py-2">
                      <select className={`${fieldCls} w-full`} value={editDraft.unit} onChange={e => setEditDraft({ ...editDraft, unit: e.target.value })}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2"><input className={`${fieldCls} w-20 text-right`} inputMode="decimal" value={editDraft.unit_cost} onChange={e => setEditDraft({ ...editDraft, unit_cost: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className={`${fieldCls} w-20 text-right`} inputMode="decimal" value={editDraft.unit_price} onChange={e => setEditDraft({ ...editDraft, unit_price: e.target.value })} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={saveEdit} disabled={saving} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg" aria-label="Save"><Check size={15} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg" aria-label="Cancel"><X size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                    <td className="px-3 py-3 text-gray-500">{m.category || '—'}</td>
                    <td className="px-3 py-3 text-gray-500">{m.unit}</td>
                    <td className="px-3 py-3 text-right text-gray-500">{money(m.unit_cost)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-900">{money(m.unit_price)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(m)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg" aria-label="Edit"><Pencil size={14} /></button>
                        <button onClick={() => remove(m.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" aria-label="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
