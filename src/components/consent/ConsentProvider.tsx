'use client'

import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { Category, ConsentState, Regime } from '@/lib/consent/types'
import { POLICY_VERSION, UI_VERSION } from '@/lib/consent/policy'
import { detectGPC } from '@/lib/consent/gpc'
import { getOrCreateAnonymousId, readConsentCookie, readRegionCookie, writeConsentCookie } from '@/lib/consent/storage'

type ContextValue = {
  regime: Regime
  consent: ConsentState
  hasDecided: boolean
  gpc: boolean
  preferencesOpen: boolean
  optOutToastVisible: boolean
  openPreferences: () => void
  closePreferences: () => void
  acceptAll: () => void
  rejectAll: () => void
  updateCategory: (category: Category, value: boolean) => void
  saveCurrent: () => void
  dismissOptOutToast: () => void
}

const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  personalization: false,
}

const ALL_GRANTED: ConsentState = {
  necessary: true,
  analytics: true,
  marketing: true,
  personalization: true,
}

export const ConsentContext = createContext<ContextValue | null>(null)

function emitConsentMode(consent: ConsentState) {
  if (typeof window === 'undefined') return
  const w = window as unknown as { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] }
  if (!w.gtag && !w.dataLayer) return
  const gtag = w.gtag ?? ((...args: unknown[]) => { w.dataLayer = w.dataLayer || []; w.dataLayer.push(args) })
  gtag('consent', 'update', {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.marketing ? 'granted' : 'denied',
    ad_user_data: consent.marketing ? 'granted' : 'denied',
    ad_personalization: consent.marketing ? 'granted' : 'denied',
    personalization_storage: consent.personalization ? 'granted' : 'denied',
  })
}

async function logConsent(payload: {
  anonymousId: string
  regime: Regime
  consent: ConsentState
  country: string
  region: string
  gpc: boolean
}) {
  try {
    await fetch('/api/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        anonymous_id: payload.anonymousId,
        regime: payload.regime,
        jurisdiction_country: payload.country,
        jurisdiction_region: payload.region,
        consent: payload.consent,
        gpc_signal: payload.gpc,
        policy_version: POLICY_VERSION,
        ui_version: UI_VERSION,
      }),
    })
  } catch {
    // Logging is best-effort; cookie is the source of truth client-side.
  }
}

export function ConsentProvider({ children, initialRegime }: { children: React.ReactNode; initialRegime: Regime }) {
  const [regime, setRegime] = useState<Regime>(initialRegime)
  const [consent, setConsent] = useState<ConsentState>(DEFAULT_CONSENT)
  const [hasDecided, setHasDecided] = useState(false)
  const [gpc, setGpc] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [optOutToastVisible, setOptOutToastVisible] = useState(false)
  const [country, setCountry] = useState('')
  const [regionCode, setRegionCode] = useState('')

  useEffect(() => {
    const cookieRegime = (readRegionCookie('__consent_region') as Regime) || initialRegime
    if (cookieRegime !== regime) setRegime(cookieRegime)
    setCountry(readRegionCookie('__consent_country'))
    setRegionCode(readRegionCookie('__consent_region_code'))

    const stored = readConsentCookie()
    const gpcSignal = detectGPC()
    setGpc(gpcSignal)

    if (stored) {
      setConsent(stored.consent)
      setHasDecided(true)
      emitConsentMode(stored.consent)
      return
    }

    if (gpcSignal) {
      const auto: ConsentState = { ...DEFAULT_CONSENT }
      writeConsentCookie(auto, true)
      setConsent(auto)
      setHasDecided(true)
      emitConsentMode(auto)
      if (cookieRegime === 'ccpa') setOptOutToastVisible(true)
      void logConsent({
        anonymousId: getOrCreateAnonymousId(),
        regime: cookieRegime,
        consent: auto,
        country: readRegionCookie('__consent_country'),
        region: readRegionCookie('__consent_region_code'),
        gpc: true,
      })
    }
  }, [initialRegime, regime])

  const persist = useCallback(
    (next: ConsentState) => {
      writeConsentCookie(next, gpc)
      setConsent(next)
      setHasDecided(true)
      emitConsentMode(next)
      void logConsent({
        anonymousId: getOrCreateAnonymousId(),
        regime,
        consent: next,
        country,
        region: regionCode,
        gpc,
      })
    },
    [country, gpc, regime, regionCode],
  )

  const acceptAll = useCallback(() => persist(ALL_GRANTED), [persist])
  const rejectAll = useCallback(() => persist(DEFAULT_CONSENT), [persist])
  const updateCategory = useCallback((category: Category, value: boolean) => {
    setConsent((prev) => ({ ...prev, [category]: category === 'necessary' ? true : value }))
  }, [])
  const saveCurrent = useCallback(() => persist(consent), [consent, persist])
  const openPreferences = useCallback(() => setPreferencesOpen(true), [])
  const closePreferences = useCallback(() => setPreferencesOpen(false), [])
  const dismissOptOutToast = useCallback(() => setOptOutToastVisible(false), [])

  const value = useMemo<ContextValue>(
    () => ({
      regime,
      consent,
      hasDecided,
      gpc,
      preferencesOpen,
      optOutToastVisible,
      openPreferences,
      closePreferences,
      acceptAll,
      rejectAll,
      updateCategory,
      saveCurrent,
      dismissOptOutToast,
    }),
    [acceptAll, closePreferences, consent, dismissOptOutToast, gpc, hasDecided, openPreferences, optOutToastVisible, preferencesOpen, regime, rejectAll, saveCurrent, updateCategory],
  )

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
}
