import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.abc',
});

export async function POST(request: Request) {
  try {
    const { jobId, amount, contractorStripeId } = await request.json();

    // Create a Checkout Session for the Homeowner to pay the contractor
    // We use transfer_data to specify the destination account
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Job Payment ${jobId}` },
            unit_amount: amount * 100, // Cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      transfer_data: {
        destination: contractorStripeId,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/jobs/${jobId}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/jobs/${jobId}`,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
