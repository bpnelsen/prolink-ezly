import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase-client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.abc',
});

export async function POST(request: Request) {
  try {
    const { contractorId } = await request.json();

    // 1. Create a Stripe Connect account for the contractor
    const account = await stripe.accounts.create({
      type: 'express',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // 2. Update the database with the stripe_account_id
    const { error } = await supabase
      .from('contractor_billing')
      .upsert({ contractor_id: contractorId, stripe_account_id: account.id, onboarding_status: 'pending' });

    if (error) throw error;

    // 3. Create the account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/contractor/settings/billing`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/contractor/settings/billing`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
