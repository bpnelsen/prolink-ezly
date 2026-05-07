import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-04-22.dahlia',
})

export const PROLINK_FEE_PERCENT = 0.03 // 3% platform fee
export const VOLUME_WAIVER_THRESHOLD = 3500 // $3,500 in customer payments = free month
