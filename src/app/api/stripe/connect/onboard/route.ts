import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '../../../../../lib/stripe-server'
import { createServiceRoleClient, createAnonClient } from '../../../../../lib/supabase-server'

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await createAnonClient().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceRoleClient()
  const { data: contractor } = await db
    .from('customers')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single()

  if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })

  let accountId = contractor.stripe_account_id

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
        us_bank_account_ach_payments: { requested: true },
      },
      metadata: { contractor_id: user.id },
    })
    accountId = account.id
    await db
      .from('customers')
      .update({ stripe_account_id: accountId, stripe_connect_status: 'pending' })
      .eq('id', user.id)
  }

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/settings/payouts?refresh=true`,
    return_url: `${origin}/settings/payouts?success=true`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}
