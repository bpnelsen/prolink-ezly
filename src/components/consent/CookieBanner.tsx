'use client'

import { useConsent } from '@/hooks/useConsent'
import { PreferencesModal } from './PreferencesModal'

// LEGAL REVIEW NEEDED — banner copy
const COPY = {
  gdpr: 'We use cookies for essential site functions, and — with your permission — for analytics and marketing. You can change your choices any time.',
  ccpa: 'We use cookies and similar technologies. California residents have the right to opt out of the sale or sharing of personal information.',
  default: 'We use cookies to run the site and, with your permission, to improve it. Choose what you\'re comfortable with.',
}

export function CookieBanner() {
  const { regime, hasDecided, acceptAll, rejectAll, openPreferences, preferencesOpen } = useConsent()

  if (hasDecided && !preferencesOpen) return null

  const showBanner = !hasDecided

  return (
    <>
      {showBanner && (
        <div
          role="region"
          aria-label="Cookie consent"
          className="fixed bottom-0 left-0 right-0 z-[9998] motion-safe:animate-[fadeIn_200ms_ease-out] border-t border-gray-200 bg-white shadow-2xl"
        >
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 text-sm text-gray-700">
                <p className="font-semibold text-gray-900">Your privacy choices</p>
                <p className="mt-1">
                  {COPY[regime]}{' '}
                  <a href="/cookie-policy" className="underline text-[#0f3a7d] hover:no-underline">
                    Cookie policy
                  </a>
                </p>
                {regime === 'ccpa' && (
                  <button
                    type="button"
                    onClick={rejectAll}
                    className="mt-2 inline-block text-sm font-medium text-[#0f3a7d] underline hover:no-underline"
                  >
                    Do Not Sell or Share My Personal Information
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 sm:min-w-[420px]">
                <BannerButton onClick={rejectAll} label="Reject All" />
                <BannerButton onClick={openPreferences} label="Manage Preferences" />
                <BannerButton onClick={acceptAll} label="Accept All" />
              </div>
            </div>
          </div>
        </div>
      )}
      {preferencesOpen && <PreferencesModal />}
    </>
  )
}

function BannerButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[#0f3a7d] bg-white px-4 text-sm font-semibold text-[#0f3a7d] transition hover:bg-[#0f3a7d] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3a7d] focus-visible:ring-offset-2"
    >
      {label}
    </button>
  )
}
