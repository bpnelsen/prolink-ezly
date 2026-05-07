import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '../../../../../lib/stripe-server'
import { createServiceRoleClient, createAnonClient } from '../../../../../lib/supabase-server'

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await createAnonClient().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceRoleClient()
  const { data: contractor } = await db
    .from('customers')
    .select('stripe_account_id, stripe_connect_status')
    .eq('id', user.id)
    .single()

  if (!contractor?.stripe_account_id) {
    return NextResponse.json({ status: 'not_connected' })
  }

  const account = await stripe.accounts.retrieve(contractor.stripe_account_id)
  const status = account.charges_enabled
    ? 'active'
    : account.details_submitted
      ? 'pending'
      : 'not_connected'

  if (status !== contractor.stripe_connect_status) {
    await db
      .from('customers')
      .update({ stripe_connect_status: status })
      .eq('id', user.id)
  }

  return NextResponse.json({
    status,
    charges_enabled: account.charges_enabled,
    details_submitted: account.details_submitted,
    payouts_enabled: account.payouts_enabled,
    dashboard_url: `https://dashboard.stripe.com/express/${contractor.stripe_account_id}`,
  })
}
