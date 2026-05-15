-- Migration 011: Stripe Connect (Express) for contractor payouts
-- Adds Stripe account fields to contractors and payment tracking fields
-- to the payments table. Run in Supabase SQL editor.

-- Contractor-side: Stripe Connect Express account info lives on customers
-- (which is the per-contractor business profile, keyed to profiles.id).
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_account_country TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customers_stripe_account_id
  ON public.customers(stripe_account_id);

-- Payment-side: link payments back to Stripe so webhooks are idempotent
-- and we can show transaction details in the UI.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_application_fee_amount INTEGER,
  ADD COLUMN IF NOT EXISTS stripe_fee_amount INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent
  ON public.payments(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_session
  ON public.payments(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
