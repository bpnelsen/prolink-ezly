-- Migration 012: Stripe subscriptions for Prolink platform billing
-- Run in Supabase SQL editor.
-- Note: customers.stripe_customer_id already exists from prior work, so we
-- don't add it here.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_lookup_key TEXT,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer_id
  ON public.customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_stripe_subscription_id
  ON public.customers(stripe_subscription_id);
