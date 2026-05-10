export type Regime = 'gdpr' | 'ccpa' | 'default'

export type Category = 'necessary' | 'analytics' | 'marketing' | 'personalization'

export type ConsentState = {
  necessary: true
  analytics: boolean
  marketing: boolean
  personalization: boolean
}

export type StoredConsent = {
  consent: ConsentState
  policyVersion: string
  decidedAt: string
  gpc: boolean
}
