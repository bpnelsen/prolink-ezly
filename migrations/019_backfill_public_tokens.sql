-- Migration 019: Backfill public_token for invoices and contracts.
--
-- The invoices and contracts tables declare:
--     public_token UUID NOT NULL DEFAULT gen_random_uuid()
-- but in some environments these columns were added to a table that
-- already had rows, leaving existing rows with NULL tokens. The
-- contractor-side "View as Customer" / "Copy Portal Link" actions then
-- produce links like /invoice/undefined that resolve to the
-- "Invoice not found" page.
--
-- This migration:
--   1. Backfills any NULL public_token values with a fresh uuid.
--   2. Re-asserts the NOT NULL + DEFAULT constraints so the column
--      stays self-healing for future inserts.
--
-- Safe to run multiple times.

BEGIN;

-- Invoices ------------------------------------------------------------------
UPDATE public.invoices
   SET public_token = gen_random_uuid()
 WHERE public_token IS NULL;

ALTER TABLE public.invoices
  ALTER COLUMN public_token SET DEFAULT gen_random_uuid();

ALTER TABLE public.invoices
  ALTER COLUMN public_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_public_token
  ON public.invoices(public_token);

-- Contracts -----------------------------------------------------------------
UPDATE public.contracts
   SET public_token = gen_random_uuid()
 WHERE public_token IS NULL;

ALTER TABLE public.contracts
  ALTER COLUMN public_token SET DEFAULT gen_random_uuid();

ALTER TABLE public.contracts
  ALTER COLUMN public_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_public_token
  ON public.contracts(public_token);

COMMIT;
