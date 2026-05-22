-- Migration 020: Normalize phone numbers on imported_contractors.
--
-- Strategy:
--   1. Strip every non-digit, non-plus character to get a digit string.
--   2. If 10 digits → format as "(NNN) NNN-NNNN" (matches the existing
--      project house style, e.g. "(801) 555-0101" in supabase-setup.sql).
--   3. If 11 digits starting with 1 (US country code) → drop the 1 and
--      apply the same format.
--   4. If it already starts with "+" → leave alone, it's international
--      and our 10-digit heuristic doesn't apply.
--   5. Anything else (7 digits, 9 digits, has an extension, all zeros,
--      empty after stripping) → leave the original value untouched.
--      Better to surface bad data than silently null it out.
--
-- Safe to re-run: already-formatted numbers go through the same pipeline
-- and produce the same output.
--
-- ---------------------------------------------------------------------------
-- STEP 1 — preview. Run this block first to see what'll change. Comment
-- out (or skip) the STEP 2 UPDATE until you're happy with the diff.
-- ---------------------------------------------------------------------------
WITH cleaned AS (
  SELECT
    id,
    phone AS old_phone,
    -- digits only, ignoring + and any extension after the first 11 digits
    regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') AS digits,
    coalesce(phone, '') ~ '^\s*\+' AS is_international
  FROM public.imported_contractors
), formatted AS (
  SELECT
    id, old_phone, digits, is_international,
    CASE
      WHEN is_international                            THEN old_phone
      WHEN length(digits) = 10                         THEN
        '(' || substr(digits, 1, 3) || ') ' || substr(digits, 4, 3) || '-' || substr(digits, 7, 4)
      WHEN length(digits) = 11 AND substr(digits,1,1) = '1' THEN
        '(' || substr(digits, 2, 3) || ') ' || substr(digits, 5, 3) || '-' || substr(digits, 8, 4)
      ELSE old_phone
    END AS new_phone
  FROM cleaned
)
SELECT
  COUNT(*) FILTER (WHERE old_phone IS DISTINCT FROM new_phone) AS will_change,
  COUNT(*) FILTER (WHERE old_phone = new_phone)               AS unchanged,
  COUNT(*) FILTER (WHERE old_phone IS NULL OR old_phone = '') AS empty_to_begin_with,
  COUNT(*) FILTER (WHERE is_international)                    AS skipped_international,
  COUNT(*) FILTER (WHERE NOT is_international AND length(digits) NOT IN (10, 11)) AS skipped_wrong_length,
  COUNT(*)                                                    AS total_rows
FROM formatted;

-- Spot-check a sample (uncomment to run):
-- SELECT old_phone, new_phone
-- FROM formatted
-- WHERE old_phone IS DISTINCT FROM new_phone
-- ORDER BY random()
-- LIMIT 30;


-- ---------------------------------------------------------------------------
-- STEP 2 — write. Run this after you're satisfied with the preview.
-- Wrap in a transaction so you can ROLLBACK if the sample looks wrong.
-- ---------------------------------------------------------------------------
BEGIN;

WITH cleaned AS (
  SELECT
    id,
    phone AS old_phone,
    regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') AS digits,
    coalesce(phone, '') ~ '^\s*\+' AS is_international
  FROM public.imported_contractors
), formatted AS (
  SELECT
    id, old_phone, digits, is_international,
    CASE
      WHEN is_international                            THEN old_phone
      WHEN length(digits) = 10                         THEN
        '(' || substr(digits, 1, 3) || ') ' || substr(digits, 4, 3) || '-' || substr(digits, 7, 4)
      WHEN length(digits) = 11 AND substr(digits,1,1) = '1' THEN
        '(' || substr(digits, 2, 3) || ') ' || substr(digits, 5, 3) || '-' || substr(digits, 8, 4)
      ELSE old_phone
    END AS new_phone
  FROM cleaned
)
UPDATE public.imported_contractors ic
SET    phone = f.new_phone
FROM   formatted f
WHERE  ic.id = f.id
  AND  ic.phone IS DISTINCT FROM f.new_phone;

-- Verify the update count looks right, then either:
--   COMMIT;   -- to save the changes, OR
--   ROLLBACK; -- to undo
COMMIT;
