import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Stripe placeholder. To enable online payments:
  // 1. Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY env vars
  // 2. Install @stripe/stripe-js and stripe packages
  // 3. Replace this stub with real Stripe Checkout Session creation
  // 4. Add /api/stripe/webhook to handle payment_intent.succeeded events
  //    that auto-insert into the payments table

  const body = await req.json().catch(() => ({}))

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({
      error: 'stripe_not_configured',
      message: 'Online payments are not yet enabled. Please contact your contractor to arrange payment via cash, check, or bank transfer.',
      invoiceId: body.invoiceId,
    }, { status: 501 })
  }

  // TODO: Real Stripe integration
  return NextResponse.json({
    error: 'stripe_not_implemented',
    message: 'Stripe integration is plumbed but not yet active.',
  }, { status: 501 })
}
