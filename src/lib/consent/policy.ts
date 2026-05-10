import type { Category } from './types'

export const POLICY_VERSION = '1.0.0'
export const UI_VERSION = '1.0.0'
export const CONSENT_COOKIE = '__consent'
export const REGION_COOKIE = '__consent_region'
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

// LEGAL REVIEW NEEDED — user-facing category descriptions
export const CATEGORY_META: Record<Category, { label: string; description: string; locked?: boolean }> = {
  necessary: {
    label: 'Strictly necessary',
    description: 'Required for the site to function — sign-in, security, and your saved preferences. These are always on.',
    locked: true,
  },
  analytics: {
    label: 'Analytics',
    description: 'Helps us understand which pages and features are used so we can improve the product.',
  },
  marketing: {
    label: 'Marketing',
    description: 'Used to measure ad performance and show you relevant offers on other sites.',
  },
  personalization: {
    label: 'Personalization',
    description: 'Remembers your choices to tailor content and recommendations to you.',
  },
}

export const ALL_CATEGORIES: Category[] = ['necessary', 'analytics', 'marketing', 'personalization']
