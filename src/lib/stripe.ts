import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''

export const PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS || 200) // 2% default

export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY
}

let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  if (!_stripe) {
    _stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia',
      typescript: true,
      appInfo: { name: 'Prolink by EZLY', url: 'https://app.useezly.com' },
    })
  }
  return _stripe
}

/** Calculate platform fee in cents from a total in cents. */
export function calcApplicationFee(amountCents: number): number {
  return Math.round((amountCents * PLATFORM_FEE_BPS) / 10_000)
}
