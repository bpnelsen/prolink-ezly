-- Migration 017: Single flat plan — $49/mo + $15 per extra seat.
-- Run in the Supabase SQL editor. Self-contained: it does NOT assume the
-- migration-007 plan columns exist (some projects never ran 007), so every
-- column it touches is added IF NOT EXISTS first.
--
-- Replaces the old 4-tier model (trial/starter/pro/business). Trial is now
-- a STATUS, not a plan: every account is on the single 'standard' plan; a
-- 14-day free trial is tracked via subscription_status='trialing' +
-- trial_ends_at. Seats: 1 (owner, included in the $49 base) by default;
-- each extra seat is +$15/mo.

-- 1. Ensure every column exists (legacy 007 columns + new billing columns).
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS plan                   TEXT,
  ADD COLUMN IF NOT EXISTS plan_status            TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_ends_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_started_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seats                  INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status    TEXT NOT NULL DEFAULT 'trialing';

-- 2. Drop the old tier CHECK constraints (auto-named variants too).
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_plan_check;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_plan_check1;

-- 3. Pin the plan default and normalize every existing row onto the single
--    plan. Keep any in-flight trial window; default a fresh 14-day trial
--    where one isn't set.
ALTER TABLE public.customers ALTER COLUMN plan SET DEFAULT 'standard';

UPDATE public.customers
SET
  plan = 'standard',
  seats = GREATEST(COALESCE(seats, 1), 1),
  subscription_status = CASE
    WHEN COALESCE(trial_ends_at, now()) > now() THEN 'trialing'
    ELSE COALESCE(NULLIF(subscription_status, ''), 'trialing')
  END,
  trial_ends_at = COALESCE(trial_ends_at, timezone('utc', now()) + interval '14 days'),
  plan_started_at = COALESCE(plan_started_at, created_at, timezone('utc', now()))
WHERE plan IS DISTINCT FROM 'standard'
   OR plan IS NULL
   OR seats IS NULL;

-- 4. Light guard so only the known statuses are stored.
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_subscription_status_check;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_subscription_status_check
  CHECK (subscription_status IN ('trialing','active','past_due','canceled','incomplete','paused'));
