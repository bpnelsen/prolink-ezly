'use client'
import { useState } from 'react'
import { StickyNote, Phone, Mail, MessageSquare, ClipboardList, Calendar, Check, Trash2 } from 'lucide-react'
import { crmAPI, formatDateTime } from '@/lib/crm-client'
import type { Activity, ActivityKind } from '@/lib/crm-types'

const ICON: Record<ActivityKind, React.ReactNode> = {
  note: <StickyNote size={14} />,
  call: <Phone size={14} />,
  email: <Mail size={14} />,
  sms: <MessageSquare size={14} />,
  task: <ClipboardList size={14} />,
  meeting: <Calendar size={14} />,
}

const COLOR: Record<ActivityKind, string> = {
  note: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  call: 'bg-blue-50 text-blue-700 border-blue-200',
  email: 'bg-purple-50 text-purple-700 border-purple-200',
  sms: 'bg-green-50 text-green-700 border-green-200',
  task: 'bg-orange-50 text-orange-700 border-orange-200',
  meeting: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

export default function ActivityTimeline({
  activities, onChange,
}: {
  activities: Activity[]
  onChange: (next: Activity[]) => void
}) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        No activity yet. Log a note, call, or schedule a follow-up above.
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {activities.map(a => (
        <Item key={a.id} activity={a}
          onChange={(updated) => onChange(activities.map(x => x.id === updated.id ? updated : x))}
          onRemove={() => onChange(activities.filter(x => x.id !== a.id))}
        />
      ))}
    </div>
  )
}

function Item({
  activity, onChange, onRemove,
}: {
  activity: Activity
  onChange: (a: Activity) => void
  onRemove: () => void
}) {
  const [busy, setBusy] = useState(false)
  const overdue = !activity.completed && activity.due_at && new Date(activity.due_at) < new Date()

  const toggle = async () => {
    setBusy(true)
    try {
      const { activity: updated } = await crmAPI.activities.patch(activity.id, { completed: !activity.completed })
      onChange(updated)
    } catch (e) { alert((e as Error).message) }
    finally { setBusy(false) }
  }

  const remove = async () => {
    if (!confirm('Delete this activity?')) return
    setBusy(true)
    try {
      await crmAPI.activities.remove(activity.id)
      onRemove()
    } catch (e) { alert((e as Error).message) }
    finally { setBusy(false) }
  }

  return (
    <div className={`bg-white border rounded-xl p-4 flex gap-3 ${overdue ? 'border-rose-200' : 'border-gray-200'}`}>
      <div className={`shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${COLOR[activity.kind]}`}>
        {ICON[activity.kind]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {activity.subject && <p className="font-bold text-gray-900 truncate">{activity.subject}</p>}
            {activity.body && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap mt-0.5">{activity.body}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {(activity.kind === 'task' || activity.kind === 'meeting') && (
              <button
                disabled={busy} onClick={toggle}
                className={`p-1.5 rounded-md border transition ${
                  activity.completed
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'border-gray-200 text-gray-500 hover:border-emerald-500 hover:text-emerald-700'
                }`}
                title={activity.completed ? 'Mark as open' : 'Mark complete'}
              ><Check size={14} /></button>
            )}
            <button
              disabled={busy} onClick={remove}
              className="p-1.5 rounded-md border border-gray-200 text-gray-400 hover:border-rose-500 hover:text-rose-700"
              title="Delete activity"
            ><Trash2 size={14} /></button>
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-gray-500">
          <span className="uppercase tracking-wider font-bold text-gray-400">{activity.kind}</span>
          <span>· {formatDateTime(activity.created_at)}</span>
          {activity.owner_email && <span>· {activity.owner_email}</span>}
          {activity.due_at && (
            <span className={overdue ? 'text-rose-600 font-semibold' : 'text-gray-500'}>
              · Due {formatDateTime(activity.due_at)}
            </span>
          )}
          {activity.completed && activity.completed_at && (
            <span className="text-emerald-700 font-semibold">· Done {formatDateTime(activity.completed_at)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
