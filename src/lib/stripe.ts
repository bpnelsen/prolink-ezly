import Stripe from 'stripe'

/** Single flat plan: $49/mo with unlimited team seats included. */
export const PRICING = {
  monthlyPrice: 49,
  trialDays: 14,
} as const

const SECRET = process.env.STRIPE_SECRET_KEY || ''

export const STRIPE_BASE_PRICE_ID = process.env.STRIPE_BASE_PRICE_ID || ''
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

/** Returns a Stripe client, or null when billing isn't configured yet. */
export function getStripe(): Stripe | null {
  if (!SECRET) return null
  return new Stripe(SECRET)
}

export function billingConfigured(): boolean {
  return Boolean(SECRET && STRIPE_BASE_PRICE_ID)
}
