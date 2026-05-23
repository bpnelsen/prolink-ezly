'use client'
import { useEffect, useState } from 'react'
import { Mail, MessageSquare, Plus, Trash2, Save, X, Edit3 } from 'lucide-react'
import { templatesAPI } from '@/lib/crm-templates-client'
import type { CRMTemplate, TemplateKind } from '@/lib/crm-templates'
import { TEMPLATE_VARS } from '@/lib/crm-templates'

export default function TemplatesPage() {
  const [items, setItems] = useState<CRMTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<CRMTemplate | 'new-email' | 'new-dm' | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try { setItems((await templatesAPI.list()).items) }
    catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const byKind: Record<TemplateKind, CRMTemplate[]> = {
    email: items.filter(t => t.kind === 'email'),
    dm: items.filter(t => t.kind === 'dm'),
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Message templates</h1>
        <p className="text-sm text-gray-500 mt-1">
          Stored email subjects/bodies and LinkedIn DM scripts. Reference any contractor field with{' '}
          <code className="text-[11px] bg-gray-100 px-1 rounded">{'{{business_name}}'}</code>,{' '}
          <code className="text-[11px] bg-gray-100 px-1 rounded">{'{{city}}'}</code>, etc.
        </p>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      <Section
        title="Email" icon={<Mail size={16} />}
        templates={byKind.email}
        onAdd={() => setEditing('new-email')}
        onEdit={(t) => setEditing(t)}
        onChanged={load}
      />

      <Section
        title="LinkedIn DM" icon={<MessageSquare size={16} />}
        templates={byKind.dm}
        onAdd={() => setEditing('new-dm')}
        onEdit={(t) => setEditing(t)}
        onChanged={load}
      />

      {editing && (
        <TemplateModal
          template={typeof editing === 'string' ? null : editing}
          defaultKind={editing === 'new-email' ? 'email' : editing === 'new-dm' ? 'dm' : (editing as CRMTemplate).kind}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}

function Section({
  title, icon, templates, onAdd, onEdit, onChanged,
}: {
  title: string
  icon: React.ReactNode
  templates: CRMTemplate[]
  onAdd: () => void
  onEdit: (t: CRMTemplate) => void
  onChanged: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{icon} {title} templates</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
        >
          <Plus size={14} /> New
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">
          No {title.toLowerCase()} templates yet.
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {templates.map(t => (
            <li key={t.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{t.name}</p>
                  {t.subject && (
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">Subject: {t.subject}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => onEdit(t)}
                    className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:border-teal-500 hover:text-teal-700"
                    title="Edit"
                  ><Edit3 size={14} /></button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete "${t.name}"?`)) return
                      try { await templatesAPI.remove(t.id); onChanged() }
                      catch (e) { alert((e as Error).message) }
                    }}
                    className="p-1.5 rounded-md border border-gray-200 text-gray-400 hover:border-rose-500 hover:text-rose-700"
                    title="Delete"
                  ><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-xs text-gray-600 whitespace-pre-wrap mt-2 line-clamp-3">{t.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TemplateModal({
  template, defaultKind, onClose, onSaved,
}: {
  template: CRMTemplate | null
  defaultKind: TemplateKind
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(template?.name || '')
  const [subject, setSubject] = useState(template?.subject || '')
  const [body, setBody] = useState(template?.body || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const kind = template?.kind || defaultKind

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      if (template) {
        await templatesAPI.patch(template.id, {
          name, subject: kind === 'email' ? subject : null, body,
        })
      } else {
        await templatesAPI.create({
          kind, name, subject: kind === 'email' ? subject : null, body,
        })
      }
      onSaved()
    } catch (e) {
      setError((e as Error).message); setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">
            {template ? 'Edit' : 'New'} {kind === 'email' ? 'email' : 'LinkedIn DM'} template
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <Field label="Template name">
            <input
              required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cold outreach — intro"
              className={inputCls}
            />
          </Field>

          {kind === 'email' && (
            <Field label="Subject">
              <input
                required value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="Quick question, {{business_name}}"
                className={inputCls}
              />
            </Field>
          )}

          <Field label="Body">
            <textarea
              required value={body} onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Hi {{business_name}} team,..."
              className={inputCls + ' font-mono text-[13px]'}
            />
          </Field>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">
              Available variables
            </p>
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_VARS.map(v => (
                <code key={v} className="text-[11px] bg-white border border-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>

        <div className="p-5 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-bold px-4 py-2 rounded-lg">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5">
            <Save size={14} /> {saving ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls = 'w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-1.5">{label}</span>
      {children}
    </label>
  )
}
