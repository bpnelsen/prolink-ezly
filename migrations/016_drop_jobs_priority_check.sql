-- Migration 016: Remove the jobs.priority CHECK constraint entirely.
-- Run in the Supabase SQL editor.
--
-- The `jobs` table was created out-of-band (no prior migration defines it),
-- and it carries a CHECK constraint `jobs_priority_check` that rejected
-- saves whenever the form submitted a priority value outside the hard-coded
-- allow-list (e.g. casing/label mismatches), producing:
--   ERROR: new row for relation "jobs" violates check constraint
--          "jobs_priority_check"
--
-- Per request, the constraint is removed completely so priority is a free
-- value and never blocks a job save again. IF EXISTS makes this safe to
-- re-run and a no-op if the constraint is already gone or named differently.

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_priority_check;

-- Some projects auto-name it differently; drop the common variants too.
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS job_priority_check;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_priority_check1;
