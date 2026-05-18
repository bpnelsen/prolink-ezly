-- Migration 013: Security hardening follow-up.
-- Run in the Supabase SQL editor AFTER migration 012.
--
-- A verification pass after migration 011 found three more tables that the
-- app uses but that have no table definition in any migration (created
-- out-of-band, like jobs/technicians) and therefore no RLS:
--
--   * job_line_items  — per-job pricing; child of jobs
--   * job_milestones  — per-job payment schedule (amounts/dates); child of jobs
--   * pl_sites        — per-contractor published-site registry
--
-- Without RLS these are readable with the public anon key — the same
-- exposure class as the invoice_line_items hole closed in 011. Every
-- consumer in the codebase is an authenticated dashboard page or a
-- server-side (service-role) caller, so owner-scoped policies close the
-- hole without breaking any flow.
--
-- All blocks are guarded with to_regclass so the migration is a no-op for
-- any table that does not exist on a given project.

DO $$
BEGIN
  -- job_line_items: scope through the parent job's owner.
  IF to_regclass('public.job_line_items') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.job_line_items ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Contractors manage own job line items" ON public.job_line_items';
    EXECUTE 'CREATE POLICY "Contractors manage own job line items" ON public.job_line_items
               FOR ALL
               USING (EXISTS (SELECT 1 FROM public.jobs j
                              WHERE j.id = job_id AND j.contractor_id = auth.uid()))
               WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j
                              WHERE j.id = job_id AND j.contractor_id = auth.uid()))';
  END IF;

  -- job_milestones: scope through the parent job's owner.
  IF to_regclass('public.job_milestones') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.job_milestones ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Contractors manage own job milestones" ON public.job_milestones';
    EXECUTE 'CREATE POLICY "Contractors manage own job milestones" ON public.job_milestones
               FOR ALL
               USING (EXISTS (SELECT 1 FROM public.jobs j
                              WHERE j.id = job_id AND j.contractor_id = auth.uid()))
               WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j
                              WHERE j.id = job_id AND j.contractor_id = auth.uid()))';
  END IF;

  -- pl_sites: owner-scoped by contractor_id.
  IF to_regclass('public.pl_sites') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.pl_sites ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Contractors manage own pl_sites" ON public.pl_sites';
    EXECUTE 'CREATE POLICY "Contractors manage own pl_sites" ON public.pl_sites
               FOR ALL
               USING (auth.uid() = contractor_id)
               WITH CHECK (auth.uid() = contractor_id)';
  END IF;
END $$;
