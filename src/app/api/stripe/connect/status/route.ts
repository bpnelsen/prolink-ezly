import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serverError } from '../../../../../lib/server-auth'
import { getStripe, isStripeConfigured } from '../../../../../lib/stripe'

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { user, supabase } = auth

  const { data: contractor } = await supabase
    .from('customers')
    .select('stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted')
    .eq('id', user.id)
    .single()

  if (!contractor?.stripe_account_id) {
    return NextResponse.json({
      connected: false,
      configured: isStripeConfigured(),
    })
  }

  // If Stripe isn't configured server-side we can still return the cached
  // status from the DB so the UI doesn't break in dev.
  if (!isStripeConfigured()) {
    return NextResponse.json({
      connected: true,
      configured: false,
      account_id: contractor.stripe_account_id,
      charges_enabled: !!contractor.stripe_charges_enabled,
      payouts_enabled: !!contractor.stripe_payouts_enabled,
      details_submitted: !!contractor.stripe_details_submitted,
      requirements: { currently_due: [], past_due: [] },
    })
  }

  const stripe = getStripe()
  const account = await stripe.accounts.retrieve(contractor.stripe_account_id)

  // Sync cached status so the UI matches Stripe even without a webhook.
  const { error: updateErr } = await supabase
    .from('customers')
    .update({
      stripe_charges_enabled: account.charges_enabled,
      stripe_payouts_enabled: account.payouts_enabled,
      stripe_details_submitted: account.details_submitted,
      stripe_account_country: account.country || null,
      stripe_account_synced_at: new Date().toISOString(),
    })
    .eq('id', user.id)
  if (updateErr) return serverError('Could not sync Stripe status', updateErr.message)

  return NextResponse.json({
    connected: true,
    configured: true,
    account_id: account.id,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    requirements: {
      currently_due: account.requirements?.currently_due || [],
      past_due: account.requirements?.past_due || [],
      disabled_reason: account.requirements?.disabled_reason || null,
    },
  })
}
