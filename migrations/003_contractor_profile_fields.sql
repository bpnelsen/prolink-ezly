-- Migration 003: Create customers table (Prolink SaaS subscriber profiles)
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID REFERENCES public.profiles(id) PRIMARY KEY,

  -- Business identity
  business_name TEXT,
  owner_name TEXT,
  logo_url TEXT,
  phone TEXT,
  trade TEXT,
  years_in_business INTEGER,
  entity_type TEXT DEFAULT 'sole_proprietor',
  ein TEXT,
  description TEXT,
  status TEXT DEFAULT 'available',

  -- Credentials
  license_number TEXT,
  license_expiration DATE,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  insurance_expiration DATE,

  -- Location
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  service_areas TEXT,

  -- Online presence
  website TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  nextdoor_url TEXT,

  -- Brand & invoice defaults
  brand_color TEXT DEFAULT '#14b8a6',
  default_payment_terms TEXT DEFAULT 'net_30',
  default_tax_rate DECIMAL(5,2) DEFAULT 0,
  default_invoice_notes TEXT,

  -- Business hours (stored as "HH:MM AM|HH:MM AM" or "Closed")
  monday_hours TEXT,
  tuesday_hours TEXT,
  wednesday_hours TEXT,
  thursday_hours TEXT,
  friday_hours TEXT,
  saturday_hours TEXT,
  sunday_hours TEXT,

  -- Notifications
  notify_new_jobs BOOLEAN DEFAULT true,
  notify_payments BOOLEAN DEFAULT true,

  -- Admin fields
  rating DECIMAL DEFAULT 0.0,
  reviews_count INTEGER DEFAULT 0,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can read own row" ON public.customers;
DROP POLICY IF EXISTS "Customers can update own row" ON public.customers;
DROP POLICY IF EXISTS "Customers can insert own row" ON public.customers;

CREATE POLICY "Customers can read own row"
  ON public.customers FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Customers can update own row"
  ON public.customers FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Customers can insert own row"
  ON public.customers FOR INSERT
  WITH CHECK (auth.uid() = id);
