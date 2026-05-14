-- Migration 011: Security lockdown — close the public RLS hole
--
-- Background: a security assessment confirmed that anonymous (anon) callers
-- could read every row of public.invoices and public.invoice_line_items via
-- the Supabase REST API, and likely also public.contracts / contract_versions /
-- contract_signatures, because earlier migrations created SELECT policies with
-- USING (true) so the customer portal could fetch by public_token.
--
-- This migration:
--   1. Drops every "Public can view *" / "Public read *" policy that used
--      USING (true). The customer-portal pages now read via server-side API
--      routes that use the service_role key and scope by public_token, so
--      anon access is no longer needed on these tables.
--   2. Defensively ENABLEs RLS on every known public.* table.
--   3. Ensures tenant-scoped policies exist on each table (idempotent).
--   4. Revokes blanket DML grants on these tables from the anon role.
--
-- Run in Supabase SQL editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Drop the dangerous "public" policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view by token"          ON public.invoices;
DROP POLICY IF EXISTS "Public read line items"            ON public.invoice_line_items;
DROP POLICY IF EXISTS "Public can view contracts by token" ON public.contracts;
DROP POLICY IF EXISTS "Public can view contract versions"  ON public.contract_versions;
DROP POLICY IF EXISTS "Public can view contract signatures" ON public.contract_signatures;

-- ---------------------------------------------------------------------------
-- 2. Force RLS on every known public table. Tables that don't exist are skipped.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles',
    'customers',
    'clients',
    'jobs',
    'tasks',
    'technicians',
    'invoices',
    'invoice_line_items',
    'payments',
    'pl_pipelines',
    'pl_vetting_records',
    'contractor_users',
    'contracts',
    'contract_templates',
    'contract_versions',
    'contract_signatures',
    'change_orders',
    'reschedule_requests',
    'consent_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Ensure tenant-scoped policies exist on every table the CRM writes to.
--    Each block is idempotent: drop-if-exists, then create.
-- ---------------------------------------------------------------------------

-- clients ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Contractors can CRUD their clients" ON public.clients;
DROP POLICY IF EXISTS "Contractors manage own clients"     ON public.clients;
CREATE POLICY "Contractors manage own clients"
  ON public.clients FOR ALL
  TO authenticated
  USING  (auth.uid() = contractor_id)
  WITH CHECK (auth.uid() = contractor_id);

-- jobs (created elsewhere; ensure the policy exists if the table is present) ─
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jobs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Contractors manage own jobs" ON public.jobs';
    EXECUTE $p$
      CREATE POLICY "Contractors manage own jobs"
        ON public.jobs FOR ALL
        TO authenticated
        USING  (auth.uid() = contractor_id)
        WITH CHECK (auth.uid() = contractor_id)
    $p$;
  END IF;
END $$;

-- tasks ──────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Contractors can CRUD their tasks" ON public.tasks';
    EXECUTE 'DROP POLICY IF EXISTS "Contractors manage own tasks"     ON public.tasks';
    EXECUTE $p$
      CREATE POLICY "Contractors manage own tasks"
        ON public.tasks FOR ALL
        TO authenticated
        USING  (auth.uid() = contractor_id)
        WITH CHECK (auth.uid() = contractor_id)
    $p$;
  END IF;
END $$;

-- technicians ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'technicians') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Contractors manage own technicians" ON public.technicians';
    EXECUTE $p$
      CREATE POLICY "Contractors manage own technicians"
        ON public.technicians FOR ALL
        TO authenticated
        USING  (auth.uid() = contractor_id)
        WITH CHECK (auth.uid() = contractor_id)
    $p$;
  END IF;
END $$;

-- invoices ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Contractors manage own invoices" ON public.invoices;
CREATE POLICY "Contractors manage own invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING  (auth.uid() = contractor_id)
  WITH CHECK (auth.uid() = contractor_id);

-- invoice_line_items ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Contractors manage own line items" ON public.invoice_line_items;
CREATE POLICY "Contractors manage own line items"
  ON public.invoice_line_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id AND i.contractor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id AND i.contractor_id = auth.uid()
    )
  );

-- payments ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Contractors manage own payments" ON public.payments;
CREATE POLICY "Contractors manage own payments"
  ON public.payments FOR ALL
  TO authenticated
  USING  (auth.uid() = contractor_id)
  WITH CHECK (auth.uid() = contractor_id);

-- contracts ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Contractors manage own contracts" ON public.contracts;
CREATE POLICY "Contractors manage own contracts"
  ON public.contracts FOR ALL
  TO authenticated
  USING  (auth.uid() = contractor_id)
  WITH CHECK (auth.uid() = contractor_id);

-- contract_versions ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Contractors manage own contract versions" ON public.contract_versions;
CREATE POLICY "Contractors manage own contract versions"
  ON public.contract_versions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.contractor_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.contractor_id = auth.uid())
  );

-- contract_signatures ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Contractors manage own contract signatures" ON public.contract_signatures;
CREATE POLICY "Contractors manage own contract signatures"
  ON public.contract_signatures FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.contractor_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.contractor_id = auth.uid())
  );

-- change_orders ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Contractors manage own change orders" ON public.change_orders;
CREATE POLICY "Contractors manage own change orders"
  ON public.change_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.contractor_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.contractor_id = auth.uid())
  );

-- contract_templates: templates are non-sensitive shared content.
-- Keep readable to logged-in users only, not anon.
DROP POLICY IF EXISTS "Anyone can read templates"     ON public.contract_templates;
DROP POLICY IF EXISTS "Authenticated read templates"  ON public.contract_templates;
CREATE POLICY "Authenticated read templates"
  ON public.contract_templates FOR SELECT
  TO authenticated
  USING (true);

-- pl_pipelines ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Contractors can CRUD their pipelines" ON public.pl_pipelines;
DROP POLICY IF EXISTS "Contractors can manage own pipeline"  ON public.pl_pipelines;
DROP POLICY IF EXISTS "Contractors manage own pipelines"     ON public.pl_pipelines;
CREATE POLICY "Contractors manage own pipelines"
  ON public.pl_pipelines FOR ALL
  TO authenticated
  USING  (auth.uid() = contractor_id)
  WITH CHECK (auth.uid() = contractor_id);

-- pl_vetting_records ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Contractors can read own vetting" ON public.pl_vetting_records;
CREATE POLICY "Contractors read own vetting"
  ON public.pl_vetting_records FOR SELECT
  TO authenticated
  USING (auth.uid() = contractor_id);

-- reschedule_requests: tighten — was created without RLS policies. Allow
-- authenticated full CRUD for now; the table holds a free-form task_id (text),
-- not a contractor link, so there is no tenant key to scope by. Anon must not
-- read it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reschedule_requests') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated manage reschedule requests" ON public.reschedule_requests';
    EXECUTE $p$
      CREATE POLICY "Authenticated manage reschedule requests"
        ON public.reschedule_requests FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true)
    $p$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Revoke anon-role grants on every table that should be contractor-only.
--    By default Supabase grants the anon role broad DML on public.* tables;
--    we yank that back so even a missing/misconfigured policy can't leak data.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles',
    'customers',
    'clients',
    'jobs',
    'tasks',
    'technicians',
    'invoices',
    'invoice_line_items',
    'payments',
    'pl_pipelines',
    'pl_vetting_records',
    'contractor_users',
    'contracts',
    'contract_templates',
    'contract_versions',
    'contract_signatures',
    'change_orders',
    'reschedule_requests'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;

-- consent_logs intentionally retains its anon INSERT grant (cookie banner
-- writes from un-authenticated visitors), guarded by its existing
-- "consent_logs_insert_anon" policy.
