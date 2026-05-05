'use client'
import { useState } from 'react'
import { Bell, CheckCircle2 } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'

interface NotificationPrefs {
  newLeadSms: boolean
  jobConfirmedEmail: boolean
  paymentReceivedEmail: boolean
  weeklyReportEmail: boolean
  siteVisitReminder: boolean
}

export default function NotificationsPage() {
  const [saved, setSaved] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    newLeadSms: true,
    jobConfirmedEmail: true,
    paymentReceivedEmail: true,
    weeklyReportEmail: false,
    siteVisitReminder: true,
  })

  const toggle = (key: keyof NotificationPrefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const notifications = [
    { key: 'newLeadSms' as const, label: 'New Lead — SMS', desc: 'Receive an SMS when a new lead comes in.' },
    { key: 'jobConfirmedEmail' as const, label: 'Job Confirmed — Email', desc: 'Get notified when a customer confirms a site visit.' },
    { key: 'paymentReceivedEmail' as const, label: 'Payment Received — Email', desc: 'Notification when a payment is processed.' },
    { key: 'weeklyReportEmail' as const, label: 'Weekly Summary — Email', desc: 'A weekly digest of your pipeline and activity.' },
    { key: 'siteVisitReminder' as const, label: 'Site Visit Reminder', desc: 'Reminder 24 hours before a scheduled site visit.' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Notifications', href: '/settings/notifications' }]} />
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Settings</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Bell size={22} className="text-teal-600" /> Notifications
        </h2>
        <p className="text-gray-500 text-sm mb-8">Manage how and when you receive alerts.</p>

        {saved && (
          <div className="flex items-center gap-3 mb-6 p-4 bg-teal-50 text-teal-700 rounded-xl text-sm font-semibold">
            <CheckCircle2 size={16} /> Notification preferences saved!
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-6">
          {notifications.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[key]}
                onClick={() => toggle(key)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                  prefs[key] ? 'bg-teal-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    prefs[key] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}

          <button
            type="submit"
            className="py-3 px-6 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition shadow-sm flex items-center gap-2"
          >
            <Bell size={15} />
            Save Preferences
          </button>
        </form>
      </div>
    </div>
  )
}
