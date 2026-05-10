'use client'

import { useEffect, useRef } from 'react'
import { useConsent } from '@/hooks/useConsent'
import { ALL_CATEGORIES, CATEGORY_META } from '@/lib/consent/policy'
import type { Category } from '@/lib/consent/types'

export function PreferencesModal() {
  const { consent, updateCategory, saveCurrent, closePreferences, acceptAll, rejectAll } = useConsent()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeBtnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closePreferences()
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.()
    }
  }, [closePreferences])

  const handleSave = () => {
    saveCurrent()
    closePreferences()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-prefs-title"
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 p-0 motion-safe:animate-[fadeIn_150ms_ease-out] sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) closePreferences()
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-2xl rounded-t-xl bg-white shadow-2xl sm:rounded-xl"
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <h2 id="consent-prefs-title" className="text-lg font-bold text-gray-900">
            Cookie preferences
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={closePreferences}
            aria-label="Close preferences"
            className="rounded p-1 text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3a7d]"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          <p className="mb-4 text-sm text-gray-600">
            Choose which categories you allow. You can change this any time from the footer.
          </p>
          <ul className="space-y-4">
            {ALL_CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat]
              const checked = consent[cat]
              return (
                <li key={cat} className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-4">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{meta.label}</p>
                    <p className="mt-1 text-sm text-gray-600">{meta.description}</p>
                  </div>
                  <Toggle
                    checked={checked}
                    disabled={meta.locked}
                    label={meta.label}
                    onChange={(v) => updateCategory(cat as Category, v)}
                  />
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-200 px-6 py-4 sm:flex-row sm:justify-end sm:gap-3">
          <ModalButton onClick={rejectAll} label="Reject All" variant="outline" />
          <ModalButton onClick={acceptAll} label="Accept All" variant="outline" />
          <ModalButton onClick={handleSave} label="Save preferences" variant="solid" />
        </div>
      </div>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3a7d] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? 'bg-[#0f3a7d]' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function ModalButton({
  onClick,
  label,
  variant,
}: {
  onClick: () => void
  label: string
  variant: 'solid' | 'outline'
}) {
  const base = 'inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3a7d] focus-visible:ring-offset-2'
  const styles =
    variant === 'solid'
      ? 'bg-[#0f3a7d] text-white hover:bg-[#0c2f64]'
      : 'border border-[#0f3a7d] bg-white text-[#0f3a7d] hover:bg-[#0f3a7d] hover:text-white'
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles}`}>
      {label}
    </button>
  )
}
