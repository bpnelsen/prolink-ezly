'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bug, X, Send, CheckCircle2 } from 'lucide-react'

// Any other component can call this to open the modal — used by the sidebar.
export const REPORT_BUG_EVENT = 'report-bug:open'
export function openReportBug() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(REPORT_BUG_EVENT))
  }
}

// Routes where the sidebar is rendered. On these, the in-sidebar trigger
// replaces the floating one at md+ to avoid overlapping the Logout button.
const APP_ROUTE_PREFIXES = [
  '/dashboard',
  '/settings',
  '/customers',
  '/dispatch',
  '/new-job',
  '/automations',
  '/contractor',
]

function isAppRoute(pathname: string): boolean {
  return APP_ROUTE_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export default function ReportBugButton() {
  const pathname = usePathname() || ''
  const appRoute = isAppRoute(pathname)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', description: '', website: '' })
  const [pageUrl, setPageUrl] = useState('')

  // Capture the current URL when the modal opens so it appears in the email
  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      setPageUrl(window.location.href)
    }
  }, [open])

  // ESC closes the modal
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Listen for global open requests (sidebar button dispatches this)
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener(REPORT_BUG_EVENT, handler)
    return () => window.removeEventListener(REPORT_BUG_EVENT, handler)
  }, [])

  const close = () => {
    setOpen(false)
    setTimeout(() => {
      setDone(false)
      setError('')
      setForm({ email: '', description: '', website: '' })
    }, 200)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          description: form.description,
          website: form.website,
          page_url: pageUrl,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Could not send your report. Please try again later.')
      }
      setDone(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not send your report. Please try again later.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating button — bottom-left so it doesn't collide with the in-app
          AI Foreman widget (bottom-right) or the mobile hamburger (top-left).
          On desktop app routes the sidebar renders its own trigger below
          Logout, so we hide this one at md+ to prevent overlap. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-4 left-4 z-40 print:hidden items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-full shadow-md text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition ${
          appRoute ? 'flex md:hidden' : 'flex'
        }`}
        aria-label="Report a bug"
      >
        <Bug size={13} className="text-orange-500" />
        Report Bug
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[9999] flex items-end sm:items-center justify-center sm:p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Report a bug"
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug size={16} className="text-orange-500" />
                <h2 className="text-base font-bold text-gray-900">Report a Bug</h2>
              </div>
              <button onClick={close} className="text-gray-400 hover:text-gray-700" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {done ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-teal-600" />
                </div>
                <p className="text-base font-bold text-gray-900">Thanks — we got it!</p>
                <p className="text-sm text-gray-500 mt-1">
                  Our team will look into it{form.email ? ' and follow up with you' : ''}.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="p-4 sm:p-6 space-y-4">
                <p className="text-xs text-gray-500">
                  Tell us what went wrong. We&apos;ll email you back if you include your address.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    What happened? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    autoFocus
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    rows={4}
                    placeholder="Steps to reproduce, what you expected, what actually happened…"
                    className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Your email <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  />
                </div>

                {/* Honeypot — bots fill this; humans don't see it */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={e => setForm({ ...form, website: e.target.value })}
                  style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
                  aria-hidden="true"
                />

                {pageUrl && (
                  <p className="text-[10px] text-gray-400 break-all">
                    Sending from: <span className="font-mono">{pageUrl}</span>
                  </p>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={close}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !form.description.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold disabled:opacity-50">
                    <Send size={12} />
                    {submitting ? 'Sending…' : 'Send Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
