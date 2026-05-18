import { NextRequest, NextResponse } from 'next/server'
import { requireUser, badRequest, serverError } from '@/lib/server-auth'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

/** POST /api/stripe/portal — Stripe billing portal session (manage/cancel). */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { user, supabase } = auth

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json(
      { error: 'stripe_not_configured', message: 'Billing is not configured yet.' },
      { status: 501 }
    )
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()
  if (!customer?.stripe_customer_id) {
    return badRequest('No active subscription yet — start one first.')
  }

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${origin}/settings/billing`,
    })
    return NextResponse.json({ data: { url: session.url } })
  } catch (err) {
    return serverError('Could not open billing portal', err instanceof Error ? err.message : String(err))
  }
}
