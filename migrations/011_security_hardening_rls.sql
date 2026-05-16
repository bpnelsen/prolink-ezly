-- Migration 011: Security hardening — close multi-tenant RLS holes.
-- Run in the Supabase SQL editor AFTER migrations 001–010.
--
-- Background
-- ----------
-- Earlier migrations created broad `USING (true)` SELECT policies so the
-- customer-facing invoice/contract portal could read rows with the public
-- anon key. Because the anon key ships in the browser bundle, those policies
-- let ANY caller read EVERY tenant's invoices, line items, contracts,
-- contract versions and signatures (the per-token filter was only applied
-- client-side and is not a security boundary).
--
-- This migration:
--   1. Drops every `USING (true)` SELECT policy on tenant data.
--   2. Replaces public portal access with token-scoped SECURITY DEFINER
--      functions (the ONLY safe way to expose a single row by opaque token).
--   3. Enables RLS (owner-scoped) on tables that had none: jobs,
--      technicians, contractor_websites, reschedule_requests.
--   4. Restricts contract_templates to authenticated readers.
--   5. Pins search_path on the SECURITY DEFINER numbering functions.
--
-- NOTE: the platform admin panel (src/app/dashboard/admin/*) previously
-- relied on the `USING (true)` invoice policy to read every tenant's data
-- via the browser anon client. After this migration it will only see the
-- admin's own rows. A proper server-side, service-role admin API is the
-- correct follow-up — it is intentionally out of scope here.

-- ---------------------------------------------------------------------------
-- 1. Drop the dangerous public-read policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view by token"          ON public.invoices;
DROP POLICY IF EXISTS "Public read line items"            ON public.invoice_line_items;
DROP POLICY IF EXISTS "Public can view contracts by token" ON public.contracts;
DROP POLICY IF EXISTS "Public can view contract versions"  ON public.contract_versions;
DROP POLICY IF EXISTS "Public can view contract signatures" ON public.contract_signatures;

-- contract_templates holds shared boilerplate (no tenant data) but there is
-- no reason for anonymous callers to enumerate it. Authenticated contractors
-- still need it for contract creation; server-side rendering uses the
-- service-role client and bypasses RLS regardless.
DROP POLICY IF EXISTS "Anyone can read templates"          ON public.contract_templates;
DROP POLICY IF EXISTS "Authenticated can read templates"   ON public.contract_templates;
CREATE POLICY "Authenticated can read templates" ON public.contract_templates
  FOR SELECT TO authenticated USING (true);

-- The owner-scoped policies created in migrations 004/005/010 remain in
-- place, so contractors keep full access to their own rows.

-- ---------------------------------------------------------------------------
-- 2. Token-scoped public portal access (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
-- Returns the single invoice that matches the opaque public_token, plus the
-- related rows the customer portal renders. Runs as the function owner so it
-- can read the one contractor's customers/profiles/jobs rows without opening
-- those tables to anon. A caller can only ever retrieve data for a token they
-- already possess (UUID — not enumerable).
CREATE OR REPLACE FUNCTION public.get_public_invoice(p_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'invoice',
      to_jsonb(i.*)
      || jsonb_build_object(
        'clients', (
          SELECT jsonb_build_object(
            'first_name',     c.first_name,
            'last_name',      c.last_name,
            'email',          c.email,
            'phone',          c.phone,
            'street_address', c.street_address,
            'city',           c.city,
            'state',          c.state,
            'zip_code',       c.zip_code
          )
          FROM public.clients c
          WHERE c.id = i.client_id
        ),
        'business', (
          SELECT jsonb_build_object(
            'business_name',  cu.business_name,
            'logo_url',       cu.logo_url,
            'phone',          cu.phone,
            'street_address', cu.street_address,
            'city',           cu.city,
            'state',          cu.state,
            'zip_code',       cu.zip_code,
            'full_name',      pr.full_name,
            'email',          pr.email
          )
          FROM public.profiles pr
          LEFT JOIN public.customers cu ON cu.id = pr.id
          WHERE pr.id = i.contractor_id
        ),
        'job', (
          SELECT jsonb_build_object(
            'title',           j.title,
            'scheduled_start', j.scheduled_start
          )
          FROM public.jobs j
          WHERE j.id = i.job_id
        )
      ),
    'line_items', COALESCE((
      SELECT jsonb_agg(to_jsonb(li.*) ORDER BY li.position)
      FROM public.invoice_line_items li
      WHERE li.invoice_id = i.id
    ), '[]'::jsonb),
    'payments', COALESCE((
      SELECT jsonb_agg(to_jsonb(pm.*) ORDER BY pm.paid_at DESC)
      FROM public.payments pm
      WHERE pm.invoice_id = i.id
    ), '[]'::jsonb)
  )
  FROM public.invoices i
  WHERE i.public_token = p_token
  LIMIT 1;
$$;

-- One-shot "mark viewed" for the portal, scoped to the token.
CREATE OR REPLACE FUNCTION public.mark_invoice_viewed(p_token uuid)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.invoices
  SET status = 'viewed', viewed_at = now()
  WHERE public_token = p_token
    AND status = 'sent'
    AND viewed_at IS NULL;
$$;

-- Least-privilege: only the portal roles may call these.
REVOKE ALL ON FUNCTION public.get_public_invoice(uuid)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_invoice_viewed(uuid)  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_invoice(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_invoice_viewed(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Enable RLS on tables that had none
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.jobs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Contractors manage own jobs" ON public.jobs';
    EXECUTE 'CREATE POLICY "Contractors manage own jobs" ON public.jobs
               FOR ALL
               USING (auth.uid() = contractor_id)
               WITH CHECK (auth.uid() = contractor_id)';
  END IF;

  IF to_regclass('public.technicians') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Contractors manage own technicians" ON public.technicians';
    EXECUTE 'CREATE POLICY "Contractors manage own technicians" ON public.technicians
               FOR ALL
               USING (auth.uid() = contractor_id)
               WITH CHECK (auth.uid() = contractor_id)';
  END IF;

  IF to_regclass('public.contractor_websites') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.contractor_websites ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Contractors manage own website" ON public.contractor_websites';
    EXECUTE 'CREATE POLICY "Contractors manage own website" ON public.contractor_websites
               FOR ALL
               USING (auth.uid() = contractor_id)
               WITH CHECK (auth.uid() = contractor_id)';
    -- The public marketing site (/sites/[slug]) only needs PUBLISHED rows.
    EXECUTE 'DROP POLICY IF EXISTS "Public can view published sites" ON public.contractor_websites';
    EXECUTE 'CREATE POLICY "Public can view published sites" ON public.contractor_websites
               FOR SELECT
               USING (published = true)';
  END IF;

  IF to_regclass('public.reschedule_requests') IS NOT NULL THEN
    -- No app code reads/writes this with the anon key; lock it to the
    -- service role only (RLS on, zero permissive policies = deny by default).
    EXECUTE 'ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Pin search_path on the SECURITY DEFINER numbering functions
--    (hardens against search_path hijacking; logic unchanged).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_invoice_number(c_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num
  FROM public.invoices
  WHERE contractor_id = c_id;
  RETURN '#' || LPAD(next_num::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.next_contract_number(c_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  yr TEXT;
  next_num INTEGER;
BEGIN
  yr := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO next_num
  FROM public.contracts
  WHERE contractor_id = c_id
    AND contract_number LIKE 'PL-' || yr || '-%';
  RETURN 'PL-' || yr || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.next_co_number(ct_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num
  FROM public.change_orders
  WHERE contract_id = ct_id;
  RETURN 'CO-' || LPAD(next_num::TEXT, 3, '0');
END;
$$;
