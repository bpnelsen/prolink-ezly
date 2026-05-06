-- Migration 003: Expand pl_contractors with full profile fields
-- Run this in Supabase SQL editor

-- Add new columns to pl_contractors
ALTER TABLE public.pl_contractors
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS license_expiration DATE,
  ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
  ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
  ADD COLUMN IF NOT EXISTS insurance_expiration DATE,
  ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'sole_proprietor',
  ADD COLUMN IF NOT EXISTS ein TEXT,
  ADD COLUMN IF NOT EXISTS service_areas TEXT,
  ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#14b8a6',
  ADD COLUMN IF NOT EXISTS default_payment_terms TEXT DEFAULT 'net_30',
  ADD COLUMN IF NOT EXISTS default_tax_rate DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_invoice_notes TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS nextdoor_url TEXT,
  ADD COLUMN IF NOT EXISTS notify_new_jobs BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_payments BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS monday_hours TEXT,
  ADD COLUMN IF NOT EXISTS tuesday_hours TEXT,
  ADD COLUMN IF NOT EXISTS wednesday_hours TEXT,
  ADD COLUMN IF NOT EXISTS thursday_hours TEXT,
  ADD COLUMN IF NOT EXISTS friday_hours TEXT,
  ADD COLUMN IF NOT EXISTS saturday_hours TEXT,
  ADD COLUMN IF NOT EXISTS sunday_hours TEXT;

-- Ensure RLS is enabled
ALTER TABLE public.pl_contractors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any, then recreate
DROP POLICY IF EXISTS "Contractors can read own row" ON public.pl_contractors;
DROP POLICY IF EXISTS "Contractors can update own row" ON public.pl_contractors;
DROP POLICY IF EXISTS "Contractors can insert own row" ON public.pl_contractors;

CREATE POLICY "Contractors can read own row"
  ON public.pl_contractors FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Contractors can update own row"
  ON public.pl_contractors FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Contractors can insert own row"
  ON public.pl_contractors FOR INSERT
  WITH CHECK (auth.uid() = id);
