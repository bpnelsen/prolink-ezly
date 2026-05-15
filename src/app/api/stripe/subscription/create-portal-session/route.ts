import { NextRequest, NextResponse } from 'next/server'
import { requireUser, badRequest } from '../../../../../lib/server-auth'
import { getStripe, isStripeConfigured } from '../../../../../lib/stripe'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

/**
 * Creates a Stripe Customer Portal session so the contractor can manage
 * their subscription, payment method, and invoices.
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'stripe_not_configured', message: 'Stripe is not configured on the server.' },
      { status: 501 },
    )
  }

  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { user, supabase } = auth

  const { data: contractor } = await supabase
    .from('customers')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!contractor?.stripe_customer_id) {
    return badRequest('No active subscription to manage.')
  }

  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: contractor.stripe_customer_id,
    return_url: `${SITE_URL}/settings/billing`,
  })

  return NextResponse.json({ url: session.url })
}
