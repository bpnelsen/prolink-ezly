import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Stripe placeholder for invoice payments. To enable:
  // 1. Set STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in env
  // 2. Replace this stub with a real Stripe Checkout Session creation
  // 3. Extend /api/stripe/webhook to handle payment_intent.succeeded and
  //    auto-insert into the payments table

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
