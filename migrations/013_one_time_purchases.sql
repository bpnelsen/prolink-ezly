-- Migration 013: One-time platform purchases (prewired scaffolding)
-- Tracks any non-subscription, non-invoice purchase made directly on the
-- Prolink platform Stripe account (e.g. setup fees, add-ons, premium
-- templates). Records are created by the Stripe webhook handler when a
-- Checkout Session with mode='payment' and metadata.purchase_type completes.

CREATE TABLE IF NOT EXISTS public.one_time_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.profiles(id) NOT NULL,
  purchase_type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  metadata JSONB,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_time_purchases_session
  ON public.one_time_purchases(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_one_time_purchases_contractor
  ON public.one_time_purchases(contractor_id);

CREATE INDEX IF NOT EXISTS idx_one_time_purchases_type
  ON public.one_time_purchases(purchase_type);

ALTER TABLE public.one_time_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contractors read own one-time purchases" ON public.one_time_purchases;
CREATE POLICY "Contractors read own one-time purchases" ON public.one_time_purchases
  FOR SELECT USING (auth.uid() = contractor_id);
