'use client'
import { useState } from 'react'
import { StickyNote, Phone, Mail, MessageSquare, ClipboardList, Calendar } from 'lucide-react'
import { crmAPI } from '@/lib/crm-client'
import type { Activity, ActivityKind } from '@/lib/crm-types'

const KINDS: Array<{ key: ActivityKind; label: string; icon: React.ReactNode }> = [
  { key: 'note',    label: 'Note',    icon: <StickyNote size={14} /> },
  { key: 'call',    label: 'Call',    icon: <Phone size={14} /> },
  { key: 'email',   label: 'Email',   icon: <Mail size={14} /> },
  { key: 'sms',     label: 'SMS',     icon: <MessageSquare size={14} /> },
  { key: 'task',    label: 'Task',    icon: <ClipboardList size={14} /> },
  { key: 'meeting', label: 'Meeting', icon: <Calendar size={14} /> },
]

export default function ActivityComposer({
  contractorId, onCreated,
}: {
  contractorId: string
  onCreated: (a: Activity) => void
}) {
  const [kind, setKind] = useState<ActivityKind>('note')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isScheduled = kind === 'task' || kind === 'meeting'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim() && !subject.trim()) {
      setError('Add a subject or body')
      return
    }
    setSaving(true); setError(null)
    try {
      const { activity } = await crmAPI.activities.create({
        contractor_id: contractorId,
        kind,
        subject: subject.trim() || undefined,
        body: body.trim() || undefined,
        due_at: isScheduled && dueAt ? new Date(dueAt).toISOString() : null,
      })
      onCreated(activity)
      setSubject(''); setBody(''); setDueAt('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap gap-1">
        {KINDS.map(k => (
          <button
            key={k.key}
            type="button"
            onClick={() => setKind(k.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              kind === k.key
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {k.icon} {k.label}
          </button>
        ))}
      </div>

      {(kind === 'task' || kind === 'meeting' || kind === 'email') && (
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={kind === 'task' ? 'What needs to happen?' : 'Subject'}
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
        />
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          kind === 'note' ? 'Add a note about this contractor…'
          : kind === 'call' ? 'What did you discuss on the call?'
          : kind === 'email' ? 'What did you send/receive?'
          : kind === 'sms' ? 'SMS content / outcome'
          : kind === 'task' ? 'Details (optional)'
          : 'Meeting notes / agenda'
        }
        rows={3}
        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
      />

      {isScheduled && (
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
          />
          <span className="text-[11px] text-gray-400">Due date / time</span>
        </div>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-lg"
        >
          {saving ? 'Saving…' : `Log ${KINDS.find(k => k.key === kind)?.label.toLowerCase()}`}
        </button>
      </div>
    </form>
  )
}
