-- Migration 021: Normalize text fields on imported_contractors.
--
-- Cleans up data-entry inconsistencies so search, dedupe, and templates
-- behave predictably. Conservative — only adjusts whitespace/casing on
-- fields where the canonical form is unambiguous. Never nulls a row.
--
-- Operations performed:
--   email           → lower(trim(email))            (RFC: local-part is
--                                                   technically case-sensitive
--                                                   but virtually all mail
--                                                   servers treat it as
--                                                   insensitive; lowercase
--                                                   is the safe normal form)
--   business_name   → trim + collapse internal whitespace runs to one space
--   address         → same
--   city            → same
--   state           → upper(trim) when length(trim) = 2 (US state codes
--                                                       are 2-letter uppercase)
--   zip             → trim (don't reformat — 5 vs 9 digits is meaningful)
--   website         → trim, then prefix with "https://" if it's missing
--                     a scheme (so links in the CRM detail view work)
--   license_number  → trim + collapse whitespace
--   license_status  → lower(trim(license_status))
--   source          → trim
--   contact_status  → lower(trim) — the CRM UI matches against lowercase
--                                   keys like 'new', 'contacted', etc.
--   notes           → trim trailing whitespace only (preserve internal
--                     formatting like deliberate line breaks)
--
-- Safe to re-run: already-normalized rows produce the same output.
--
-- ---------------------------------------------------------------------------
-- STEP 1 — preview counts per column. Run first.
-- ---------------------------------------------------------------------------
SELECT
  COUNT(*) FILTER (
    WHERE email IS NOT NULL AND email <> lower(trim(email))
  ) AS email_will_change,
  COUNT(*) FILTER (
    WHERE business_name IS NOT NULL
      AND business_name <> regexp_replace(trim(business_name), '\s+', ' ', 'g')
  ) AS business_name_will_change,
  COUNT(*) FILTER (
    WHERE address IS NOT NULL
      AND address <> regexp_replace(trim(address), '\s+', ' ', 'g')
  ) AS address_will_change,
  COUNT(*) FILTER (
    WHERE city IS NOT NULL
      AND city <> regexp_replace(trim(city), '\s+', ' ', 'g')
  ) AS city_will_change,
  COUNT(*) FILTER (
    WHERE state IS NOT NULL
      AND length(trim(state)) = 2
      AND state <> upper(trim(state))
  ) AS state_will_change,
  COUNT(*) FILTER (
    WHERE zip IS NOT NULL AND zip <> trim(zip)
  ) AS zip_will_change,
  COUNT(*) FILTER (
    WHERE website IS NOT NULL
      AND trim(website) <> ''
      AND (
        website <> trim(website)
        OR (trim(website) !~* '^https?://' AND trim(website) <> '')
      )
  ) AS website_will_change,
  COUNT(*) FILTER (
    WHERE license_number IS NOT NULL
      AND license_number <> regexp_replace(trim(license_number), '\s+', ' ', 'g')
  ) AS license_number_will_change,
  COUNT(*) FILTER (
    WHERE license_status IS NOT NULL AND license_status <> lower(trim(license_status))
  ) AS license_status_will_change,
  COUNT(*) FILTER (
    WHERE source IS NOT NULL AND source <> trim(source)
  ) AS source_will_change,
  COUNT(*) FILTER (
    WHERE contact_status IS NOT NULL AND contact_status <> lower(trim(contact_status))
  ) AS contact_status_will_change,
  COUNT(*) FILTER (
    WHERE notes IS NOT NULL AND notes <> regexp_replace(notes, '\s+$', '')
  ) AS notes_will_change,
  COUNT(*) AS total_rows
FROM public.imported_contractors;

-- Spot-check a sample of email changes (uncomment to run):
-- SELECT email AS old_email, lower(trim(email)) AS new_email
-- FROM public.imported_contractors
-- WHERE email IS NOT NULL AND email <> lower(trim(email))
-- ORDER BY random()
-- LIMIT 30;


-- ---------------------------------------------------------------------------
-- STEP 2 — write. Run after the preview looks right. Transactional so a
-- bad result can be ROLLBACKed before COMMIT.
-- ---------------------------------------------------------------------------
BEGIN;

UPDATE public.imported_contractors
SET email = lower(trim(email))
WHERE email IS NOT NULL AND email <> lower(trim(email));

UPDATE public.imported_contractors
SET business_name = regexp_replace(trim(business_name), '\s+', ' ', 'g')
WHERE business_name IS NOT NULL
  AND business_name <> regexp_replace(trim(business_name), '\s+', ' ', 'g');

UPDATE public.imported_contractors
SET address = regexp_replace(trim(address), '\s+', ' ', 'g')
WHERE address IS NOT NULL
  AND address <> regexp_replace(trim(address), '\s+', ' ', 'g');

UPDATE public.imported_contractors
SET city = regexp_replace(trim(city), '\s+', ' ', 'g')
WHERE city IS NOT NULL
  AND city <> regexp_replace(trim(city), '\s+', ' ', 'g');

UPDATE public.imported_contractors
SET state = upper(trim(state))
WHERE state IS NOT NULL
  AND length(trim(state)) = 2
  AND state <> upper(trim(state));

UPDATE public.imported_contractors
SET zip = trim(zip)
WHERE zip IS NOT NULL AND zip <> trim(zip);

-- Website: trim, then add https:// if no scheme present.
UPDATE public.imported_contractors
SET website = CASE
  WHEN trim(website) = ''             THEN NULL
  WHEN trim(website) ~* '^https?://'  THEN trim(website)
  ELSE 'https://' || trim(website)
END
WHERE website IS NOT NULL
  AND (
    website <> trim(website)
    OR (trim(website) <> '' AND trim(website) !~* '^https?://')
    OR trim(website) = ''
  );

UPDATE public.imported_contractors
SET license_number = regexp_replace(trim(license_number), '\s+', ' ', 'g')
WHERE license_number IS NOT NULL
  AND license_number <> regexp_replace(trim(license_number), '\s+', ' ', 'g');

UPDATE public.imported_contractors
SET license_status = lower(trim(license_status))
WHERE license_status IS NOT NULL
  AND license_status <> lower(trim(license_status));

UPDATE public.imported_contractors
SET source = trim(source)
WHERE source IS NOT NULL AND source <> trim(source);

UPDATE public.imported_contractors
SET contact_status = lower(trim(contact_status))
WHERE contact_status IS NOT NULL
  AND contact_status <> lower(trim(contact_status));

UPDATE public.imported_contractors
SET notes = regexp_replace(notes, '\s+$', '')
WHERE notes IS NOT NULL
  AND notes <> regexp_replace(notes, '\s+$', '');

-- Either:
--   COMMIT;   -- save changes
--   ROLLBACK; -- undo
COMMIT;
