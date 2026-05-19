-- 018_customer_hub_enhancements.sql
-- Institutional-grade Customer Hub upgrade:
--   * Structured Google-backed address (place_id, lat/lng, verification)
--   * Richer customer record (company/individual, lifecycle, source, owner, tags)
--   * Multiple labeled addresses, multiple contacts
--   * Activity timeline, follow-up tasks, deal pipeline
--
-- Safe to run repeatedly: all statements use IF NOT EXISTS / guards.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Enrich the clients table
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS county TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS formatted_address TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address_verified BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address_verified_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'individual'; -- individual | company
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lifecycle_status TEXT DEFAULT 'lead'; -- lead|prospect|active|inactive|lost
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lead_source TEXT; -- referral|website|google|repeat|other
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Multiple labeled addresses per client (billing / service / mailing / …)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  contractor_id UUID REFERENCES public.profiles(id) NOT NULL,
  label TEXT NOT NULL DEFAULT 'service', -- service | billing | mailing | other
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  county TEXT,
  country TEXT DEFAULT 'US',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  google_place_id TEXT,
  formatted_address TEXT,
  is_primary BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Multiple contacts per client (key for company records)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  contractor_id UUID REFERENCES public.profiles(id) NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Activity timeline (notes, calls, emails, sms, meetings, system events)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  contractor_id UUID REFERENCES public.profiles(id) NOT NULL,
  type TEXT NOT NULL DEFAULT 'note', -- note|call|email|sms|meeting|system
  subject TEXT,
  body TEXT,
  created_by UUID REFERENCES public.profiles(id),
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Follow-up tasks / reminders
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  contractor_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMP WITH TIME ZONE,
  priority TEXT DEFAULT 'normal', -- low|normal|high
  status TEXT DEFAULT 'open', -- open|done
  assigned_to UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Deal / opportunity pipeline (distinct from delivered jobs)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  contractor_id UUID REFERENCES public.profiles(id) NOT NULL,
  name TEXT NOT NULL,
  stage TEXT DEFAULT 'lead', -- lead|qualified|proposal|negotiation|won|lost
  value NUMERIC DEFAULT 0,
  probability INTEGER DEFAULT 0,
  expected_close_date DATE,
  notes TEXT,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.client_addresses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_deals      ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_addresses' AND policyname='Contractors CRUD their client addresses') THEN
    CREATE POLICY "Contractors CRUD their client addresses" ON public.client_addresses
      FOR ALL USING (auth.uid() = contractor_id) WITH CHECK (auth.uid() = contractor_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_contacts' AND policyname='Contractors CRUD their client contacts') THEN
    CREATE POLICY "Contractors CRUD their client contacts" ON public.client_contacts
      FOR ALL USING (auth.uid() = contractor_id) WITH CHECK (auth.uid() = contractor_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_activities' AND policyname='Contractors CRUD their client activities') THEN
    CREATE POLICY "Contractors CRUD their client activities" ON public.client_activities
      FOR ALL USING (auth.uid() = contractor_id) WITH CHECK (auth.uid() = contractor_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_tasks' AND policyname='Contractors CRUD their client tasks') THEN
    CREATE POLICY "Contractors CRUD their client tasks" ON public.client_tasks
      FOR ALL USING (auth.uid() = contractor_id) WITH CHECK (auth.uid() = contractor_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_deals' AND policyname='Contractors CRUD their client deals') THEN
    CREATE POLICY "Contractors CRUD their client deals" ON public.client_deals
      FOR ALL USING (auth.uid() = contractor_id) WITH CHECK (auth.uid() = contractor_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_client_addresses_client  ON public.client_addresses(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_client   ON public.client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_client ON public.client_activities(client_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_tasks_client      ON public.client_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tasks_open        ON public.client_tasks(contractor_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_client_deals_client      ON public.client_deals(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_lifecycle        ON public.clients(contractor_id, lifecycle_status);
