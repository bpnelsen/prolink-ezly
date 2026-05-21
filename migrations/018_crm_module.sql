-- Migration 018: Sales CRM on top of imported_contractors.
--
-- Adds three tables (crm_pipeline_stages, crm_deals, crm_activities) plus
-- helpful indexes / updated_at triggers on imported_contractors. All four
-- tables get RLS enabled with NO permissive policies — every read/write
-- flows through the /api/crm/* routes, which use requireAdmin() to gate
-- access and return a service-role client (same pattern as the platform
-- admin code introduced in migration 011).
--
-- Run AFTER imported_contractors already exists with the shape the user
-- shared (id uuid PK, business_name, phone, email, address, city, state,
-- zip, website, license_number, license_status, specialties jsonb, source,
-- contact_status, contact_date, notes, metadata jsonb, scraped_at,
-- created_at, updated_at).

-- pg_trgm powers fuzzy business_name search in the CRM list view.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- 1. Indexes on the existing imported_contractors table
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_imp_contractors_state         ON public.imported_contractors(state);
CREATE INDEX IF NOT EXISTS idx_imp_contractors_contact_stat  ON public.imported_contractors(contact_status);
CREATE INDEX IF NOT EXISTS idx_imp_contractors_license_stat  ON public.imported_contractors(license_status);
CREATE INDEX IF NOT EXISTS idx_imp_contractors_created       ON public.imported_contractors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_imp_contractors_name_trgm     ON public.imported_contractors USING gin (business_name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 2. Pipeline stages (seeded with a default 7-stage funnel)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text UNIQUE NOT NULL,
  label       text NOT NULL,
  position    integer NOT NULL,
  is_won      boolean NOT NULL DEFAULT false,
  is_lost     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.crm_pipeline_stages (key, label, position, is_won, is_lost) VALUES
  ('new',            'New Lead',        1, false, false),
  ('contacted',      'Contacted',       2, false, false),
  ('demo_scheduled', 'Demo Scheduled',  3, false, false),
  ('demo_done',      'Demo Done',       4, false, false),
  ('negotiating',    'Negotiating',     5, false, false),
  ('won',            'Won',             6, true,  false),
  ('lost',           'Lost',            7, false, true)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Deals — one row per actively-pursued contractor
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_deals (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id        uuid NOT NULL REFERENCES public.imported_contractors(id) ON DELETE CASCADE,
  stage_key            text NOT NULL DEFAULT 'new' REFERENCES public.crm_pipeline_stages(key),
  owner_email          text,
  value_cents          integer NOT NULL DEFAULT 0,
  probability          integer NOT NULL DEFAULT 10 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date  date,
  lost_reason          text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contractor_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON public.crm_deals(stage_key);
CREATE INDEX IF NOT EXISTS idx_crm_deals_owner ON public.crm_deals(owner_email);

-- ---------------------------------------------------------------------------
-- 4. Activities — notes, calls, emails, sms, tasks, meetings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id  uuid NOT NULL REFERENCES public.imported_contractors(id) ON DELETE CASCADE,
  deal_id        uuid REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  kind           text NOT NULL CHECK (kind IN ('note','call','email','sms','task','meeting')),
  subject        text,
  body           text,
  completed      boolean NOT NULL DEFAULT false,
  due_at         timestamptz,
  completed_at   timestamptz,
  owner_email    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_contractor ON public.crm_activities(contractor_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_deal       ON public.crm_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_due_open   ON public.crm_activities(due_at) WHERE completed = false;
CREATE INDEX IF NOT EXISTS idx_crm_activities_recent     ON public.crm_activities(created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. updated_at triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_imp_contractors_updated_at ON public.imported_contractors;
CREATE TRIGGER trg_imp_contractors_updated_at
  BEFORE UPDATE ON public.imported_contractors
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_crm_deals_updated_at ON public.crm_deals;
CREATE TRIGGER trg_crm_deals_updated_at
  BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_crm_activities_updated_at ON public.crm_activities;
CREATE TRIGGER trg_crm_activities_updated_at
  BEFORE UPDATE ON public.crm_activities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Lock everything down. All access goes through service-role API routes
--    behind requireAdmin() — RLS denies the browser anon key by default
--    (zero permissive policies = deny).
-- ---------------------------------------------------------------------------
ALTER TABLE public.imported_contractors  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_stages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities        ENABLE ROW LEVEL SECURITY;
