-- Migration 008: Add city, state, zip_code to clients table

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT;
