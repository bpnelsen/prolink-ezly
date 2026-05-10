import type { ConsentState, StoredConsent } from './types'
import { CONSENT_COOKIE, CONSENT_MAX_AGE_SECONDS, POLICY_VERSION } from './policy'

const ANON_ID_KEY = '__consent_anon_id'

export function readConsentCookie(): StoredConsent | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
  if (!match) return null
  try {
    const value = decodeURIComponent(match.split('=')[1])
    const parsed = JSON.parse(value) as StoredConsent
    if (parsed.policyVersion !== POLICY_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function writeConsentCookie(consent: ConsentState, gpc: boolean): StoredConsent {
  const stored: StoredConsent = {
    consent,
    policyVersion: POLICY_VERSION,
    decidedAt: new Date().toISOString(),
    gpc,
  }
  const value = encodeURIComponent(JSON.stringify(stored))
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax; Secure`
  return stored
}

export function getOrCreateAnonymousId(): string {
  if (typeof window === 'undefined') return ''
  let id = window.localStorage.getItem(ANON_ID_KEY)
  if (!id) {
    id = (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
    window.localStorage.setItem(ANON_ID_KEY, id)
  }
  return id
}

export function readRegionCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=')[1]) : ''
}
