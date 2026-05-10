import type { Regime } from './consent/types'

export const GDPR_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE',
  'IS', 'LI', 'NO',
  'GB', 'CH',
])

export const US_STATE_PRIVACY_LAWS = new Set([
  'CA', 'CO', 'CT', 'VA', 'TX', 'UT', 'OR', 'MT', 'DE', 'IA', 'TN', 'IN', 'NJ',
])

export function detectRegime(country: string, region: string): Regime {
  const c = country.toUpperCase()
  const r = region.toUpperCase()
  if (GDPR_COUNTRIES.has(c)) return 'gdpr'
  if (c === 'US' && US_STATE_PRIVACY_LAWS.has(r)) return 'ccpa'
  return 'default'
}
