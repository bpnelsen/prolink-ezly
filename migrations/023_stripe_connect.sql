-- Migration 023: Stripe Connect (Express) — contractor payouts.
-- Run in the Supabase SQL editor. Idempotent.
--
-- Backs P1.2 in TODO.md and the decisions in docs/stripe-connect.md:
-- Express account type, separate charges and transfers, funds held on the
-- platform balance until job completion. This migration only persists the
-- onboarding state; payment hold/release columns land with P1.3.
--
-- Lifecycle:
--   pending     — account created in Stripe but contractor hasn't finished KYC
--   onboarded   — details_submitted + charges_enabled + payouts_enabled
--   restricted  — submitted but Stripe hasn't enabled all capabilities yet
--   disabled    — Stripe has disabled the account (requirements.disabled_reason)

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS stripe_account_id        TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_status    TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN NOT NULL DEFAULT false;

-- Look up customer rows by Stripe account ID (used by the account.updated
-- webhook). NULLs allowed — most rows have no Connect account yet.
CREATE UNIQUE INDEX IF NOT EXISTS customers_stripe_account_id_key
  ON public.customers (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_stripe_account_status_check;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_stripe_account_status_check
  CHECK (stripe_account_status IN ('pending','onboarded','restricted','disabled'));
