-- Migration 015: Real customer (client) portal accounts.
-- Run in the Supabase SQL editor AFTER migration 014.
--
-- Model
-- -----
--   * Customers authenticate via Supabase Auth (magic link / OTP) with
--     user_metadata.account_type = 'client'. They are NOT contractors and
--     never get a profiles/customers row.
--   * client_portal_users  : one row per portal account (= auth.users.id)
--   * client_links          : binds a portal account to contractor-owned
--                             `clients` records, established only by claiming
--                             a contractor-issued invite token (proof of
--                             possession — no blind email matching).
--   * client_portal_invites : contractor-issued, per-client claim tokens.
--
-- Portal DATA reads (invoices/messages/contracts) do NOT get new RLS
-- policies on the contractor tables — that would risk widening the
-- multi-tenant isolation hardened in 011-013. Instead the portal is served
-- by service-role server routes scoped to the caller's linked client ids
-- (see src/lib/server-auth.ts:requireClient and /api/v1/portal/*).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_portal_users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id  UUID NOT NULL REFERENCES public.client_portal_users(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contractor_id   UUID NOT NULL REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_links_unique ON public.client_links(portal_user_id, client_id);
CREATE INDEX        IF NOT EXISTS idx_client_links_user   ON public.client_links(portal_user_id);
CREATE INDEX        IF NOT EXISTS idx_client_links_client ON public.client_links(client_id);

CREATE TABLE IF NOT EXISTS public.client_portal_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.profiles(id),
  client_id     UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token         UUID NOT NULL DEFAULT gen_random_uuid(),
  email         TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at   TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cpi_token  ON public.client_portal_invites(token);
CREATE INDEX        IF NOT EXISTS idx_cpi_client ON public.client_portal_invites(client_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.client_portal_users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_links          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_invites ENABLE ROW LEVEL SECURITY;

-- Portal account can see only its own account row + links.
DROP POLICY IF EXISTS "Portal user owns account" ON public.client_portal_users;
CREATE POLICY "Portal user owns account" ON public.client_portal_users
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Portal user reads own links" ON public.client_links;
CREATE POLICY "Portal user reads own links" ON public.client_links
  FOR SELECT USING (auth.uid() = portal_user_id);

-- Contractors manage invites for their own clients. The claim itself runs
-- service-side (the claimer is the client, not the contractor).
DROP POLICY IF EXISTS "Contractors manage own portal invites" ON public.client_portal_invites;
CREATE POLICY "Contractors manage own portal invites" ON public.client_portal_invites
  FOR ALL USING (auth.uid() = contractor_id) WITH CHECK (auth.uid() = contractor_id);

-- ---------------------------------------------------------------------------
-- Signup trigger: route client accounts away from the contractor tables.
-- (Replaces the migration-012 definition; contractor path unchanged.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'account_type' = 'client' THEN
    INSERT INTO public.client_portal_users (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'contractor'                       -- never trust client-supplied role
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.customers (id, business_name, owner_name, phone)
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data->>'business_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
