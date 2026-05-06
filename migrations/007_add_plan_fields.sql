-- Migration 007: Add plan/subscription fields to customers table

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial'
    CHECK (plan IN ('trial', 'starter', 'pro', 'business')),
  ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'active'
    CHECK (plan_status IN ('active', 'past_due', 'cancelled', 'paused')),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE
    DEFAULT (timezone('utc', now()) + interval '14 days'),
  ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMP WITH TIME ZONE
    DEFAULT timezone('utc', now());

-- Backfill existing contractors onto trial
UPDATE public.customers
SET
  plan = 'trial',
  plan_status = 'active',
  trial_ends_at = COALESCE(trial_ends_at, timezone('utc', now()) + interval '14 days'),
  plan_started_at = COALESCE(plan_started_at, created_at, timezone('utc', now()))
WHERE plan IS NULL;
