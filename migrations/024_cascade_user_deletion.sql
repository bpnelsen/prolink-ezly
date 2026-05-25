-- Migration 024: Cascade user deletion through profile-owned data.
--
-- Before this migration, deleting a row from auth.users or public.profiles
-- failed with errors like:
--   "Key (id)=(...) is still referenced from table customers."
-- because the FKs from public.customers, public.clients, public.tasks, etc.
-- were created without an ON DELETE clause (defaulting to NO ACTION).
--
-- This migration rewires every FK that participates in the user-deletion
-- chain so that:
--   * 1:1 extension tables (profiles->auth.users, customers->profiles)
--     CASCADE on delete.
--   * Contractor-owned data (clients, tasks, invoices, contracts, deals,
--     conversations, etc.) CASCADEs on delete — deleting a contractor
--     account removes their CRM data.
--   * Audit / attribution columns (created_by, assigned_to, vetted_by,
--     owner_id) SET NULL so historical rows survive the deletion of the
--     user that touched them.
--
-- Safe to run repeatedly: each FK is dropped (if present) and recreated.
-- Tables that don't exist in a given environment are skipped.

-- ---------------------------------------------------------------------------
-- Helper: swap a FK's ON DELETE behavior.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._set_fk_on_delete(
  p_schema       text,
  p_table        text,
  p_column       text,
  p_ref_schema   text,
  p_ref_table    text,
  p_ref_column   text,
  p_on_delete    text   -- 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_conname text;
BEGIN
  -- Bail out silently if either table is missing in this environment.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = p_schema AND table_name = p_table
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = p_ref_schema AND table_name = p_ref_table
  ) THEN
    RETURN;
  END IF;

  -- Skip if the referencing column doesn't exist (e.g., feature not deployed).
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = p_schema AND table_name = p_table AND column_name = p_column
  ) THEN
    RETURN;
  END IF;

  -- Find the existing FK that matches (table.column -> ref_table.ref_column).
  SELECT con.conname INTO v_conname
  FROM pg_constraint con
  JOIN pg_class            rel  ON rel.oid  = con.conrelid
  JOIN pg_namespace        nsp  ON nsp.oid  = rel.relnamespace
  JOIN pg_class            frel ON frel.oid = con.confrelid
  JOIN pg_namespace        fnsp ON fnsp.oid = frel.relnamespace
  WHERE con.contype = 'f'
    AND nsp.nspname  = p_schema
    AND rel.relname  = p_table
    AND fnsp.nspname = p_ref_schema
    AND frel.relname = p_ref_table
    AND (
      SELECT array_agg(att.attname ORDER BY u.ord)
      FROM unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord)
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = u.attnum
    ) = ARRAY[p_column]
    AND (
      SELECT array_agg(att.attname ORDER BY u.ord)
      FROM unnest(con.confkey) WITH ORDINALITY AS u(attnum, ord)
      JOIN pg_attribute att ON att.attrelid = con.confrelid AND att.attnum = u.attnum
    ) = ARRAY[p_ref_column]
  LIMIT 1;

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I',
                   p_schema, p_table, v_conname);
  END IF;

  EXECUTE format(
    'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.%I (%I) ON DELETE %s',
    p_schema, p_table,
    p_table || '_' || p_column || '_fkey',
    p_column,
    p_ref_schema, p_ref_table, p_ref_column,
    p_on_delete
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 1:1 extension chains — cascade so deleting an auth user collapses cleanly.
-- ---------------------------------------------------------------------------
SELECT public._set_fk_on_delete('public', 'profiles',  'id', 'auth',   'users',    'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'customers', 'id', 'public', 'profiles', 'id', 'CASCADE');

-- ---------------------------------------------------------------------------
-- Contractor-owned data (CRM, jobs, billing, contracts, chat) — CASCADE.
-- ---------------------------------------------------------------------------
SELECT public._set_fk_on_delete('public', 'clients',                'contractor_id', 'public', 'profiles',  'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'tasks',                  'contractor_id', 'public', 'profiles',  'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'pl_pipelines',           'contractor_id', 'public', 'customers', 'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'pl_vetting_records',     'contractor_id', 'public', 'customers', 'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'invoices',               'contractor_id', 'public', 'profiles',  'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'payments',               'contractor_id', 'public', 'profiles',  'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'contracts',              'contractor_id', 'public', 'profiles',  'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'conversations',          'contractor_id', 'public', 'profiles',  'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'deal_plans',             'contractor_id', 'public', 'profiles',  'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'deal_plan_suggestions',  'contractor_id', 'public', 'profiles',  'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'client_addresses',       'contractor_id', 'public', 'profiles',  'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'client_contacts',        'contractor_id', 'public', 'profiles',  'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'client_activities',      'contractor_id', 'public', 'profiles',  'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'client_tasks',           'contractor_id', 'public', 'profiles',  'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'client_deals',           'contractor_id', 'public', 'profiles',  'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'client_links',           'contractor_id', 'public', 'profiles',  'id', 'CASCADE');
SELECT public._set_fk_on_delete('public', 'client_portal_invites',  'contractor_id', 'public', 'profiles',  'id', 'CASCADE');

-- ---------------------------------------------------------------------------
-- Audit / attribution columns — SET NULL so history survives the user delete.
-- ---------------------------------------------------------------------------
SELECT public._set_fk_on_delete('public', 'clients',            'owner_id',   'public', 'profiles', 'id', 'SET NULL');
SELECT public._set_fk_on_delete('public', 'pl_vetting_records', 'vetted_by',  'public', 'profiles', 'id', 'SET NULL');
SELECT public._set_fk_on_delete('public', 'client_activities',  'created_by', 'public', 'profiles', 'id', 'SET NULL');
SELECT public._set_fk_on_delete('public', 'client_tasks',       'assigned_to','public', 'profiles', 'id', 'SET NULL');

-- ---------------------------------------------------------------------------
-- Helper is no longer needed after migration runs.
-- ---------------------------------------------------------------------------
DROP FUNCTION public._set_fk_on_delete(text, text, text, text, text, text, text);
