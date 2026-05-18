import Stripe from 'stripe'

/** Single flat plan: $49/mo base (owner included) + $15/mo per extra seat. */
export const PRICING = {
  basePrice: 49,
  perSeatPrice: 15,
  trialDays: 14,
} as const

export function monthlyTotal(seats: number): number {
  const s = Math.max(1, Math.floor(seats || 1))
  return PRICING.basePrice + PRICING.perSeatPrice * (s - 1)
}

const SECRET = process.env.STRIPE_SECRET_KEY || ''

export const STRIPE_BASE_PRICE_ID = process.env.STRIPE_BASE_PRICE_ID || ''
export const STRIPE_SEAT_PRICE_ID = process.env.STRIPE_SEAT_PRICE_ID || ''
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

/** Returns a Stripe client, or null when billing isn't configured yet. */
export function getStripe(): Stripe | null {
  if (!SECRET) return null
  return new Stripe(SECRET)
}

export function billingConfigured(): boolean {
  return Boolean(SECRET && STRIPE_BASE_PRICE_ID && STRIPE_SEAT_PRICE_ID)
}
