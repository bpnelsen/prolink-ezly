-- Migration 029: Per-contractor materials price book.
--
-- Backs Jack's pricing: a contractor's own standard prices for materials and
-- labor. Jack reads this (plus past invoice line items) to price quotes the way
-- the contractor actually prices, and can add to it via the add_material action.
--
-- Run in the Supabase SQL editor AFTER migration 028.

CREATE TABLE IF NOT EXISTS public.materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT,
  unit          TEXT NOT NULL DEFAULT 'ea',
  unit_cost     NUMERIC(12,2),                 -- what the contractor pays (optional)
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0,  -- what the contractor charges
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_owner_name
  ON public.materials(contractor_id, name);

-- ---------------------------------------------------------------------------
-- RLS — owner-scoped. A contractor only ever sees/edits their own price book.
-- ---------------------------------------------------------------------------
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contractors manage own materials" ON public.materials;
CREATE POLICY "Contractors manage own materials" ON public.materials
  FOR ALL
  USING (auth.uid() = contractor_id)
  WITH CHECK (auth.uid() = contractor_id);
