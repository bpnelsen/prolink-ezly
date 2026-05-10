'use client'

import { useEffect } from 'react'
import { useConsent } from '@/hooks/useConsent'
import { ALL_CATEGORIES, CATEGORY_META } from '@/lib/consent/policy'
import type { Category } from '@/lib/consent/types'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

export default function CookiePreferencesPage() {
  const { consent, updateCategory, saveCurrent, acceptAll, rejectAll } = useConsent()

  useEffect(() => {
    document.title = 'Cookie preferences'
  }, [])

  return (
    <>
      <div className="max-w-3xl mx-auto px-6 py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-6">
        <ol className="flex items-center gap-2">
          <li><a href="/" className="text-[#0f3a7d] hover:underline">Home</a></li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-700" aria-current="page">Cookie preferences</li>
        </ol>
      </nav>

      <h1 className="text-3xl font-black text-[#0f3a7d] mb-4">Cookie preferences</h1>
      <p className="text-gray-700 mb-6">
        Choose which categories of cookies you allow on this site. Your choices are saved for 12 months.
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
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={meta.label}
                disabled={meta.locked}
                onClick={() => updateCategory(cat as Category, !checked)}
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
            </li>
          )
        })}
      </ul>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
        <button
          type="button"
          onClick={rejectAll}
          className="inline-flex h-11 items-center justify-center rounded-md border border-[#0f3a7d] bg-white px-4 text-sm font-semibold text-[#0f3a7d] hover:bg-[#0f3a7d] hover:text-white"
        >
          Reject All
        </button>
        <button
          type="button"
          onClick={acceptAll}
          className="inline-flex h-11 items-center justify-center rounded-md border border-[#0f3a7d] bg-white px-4 text-sm font-semibold text-[#0f3a7d] hover:bg-[#0f3a7d] hover:text-white"
        >
          Accept All
        </button>
        <button
          type="button"
          onClick={saveCurrent}
          className="inline-flex h-11 items-center justify-center rounded-md bg-[#0f3a7d] px-4 text-sm font-semibold text-white hover:bg-[#0c2f64]"
        >
          Save preferences
        </button>
      </div>

      <div className="mt-12 pt-6 border-t border-gray-200">
        <a href="/" className="text-[#0f3a7d] hover:underline">&larr; Back to home</a>
      </div>
    </div>
      <MarketingFooter />
    </>
  )
}