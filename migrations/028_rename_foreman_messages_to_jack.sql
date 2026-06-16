-- Migration 028: Rename foreman_messages -> jack_messages.
--
-- The Foreman assistant was rebranded to "Jack". This renames the chat-history
-- table (plus its index and RLS policy) to match. RENAME preserves all existing
-- rows — no data is moved or lost. Idempotent and safe to re-run.
--
-- Run in the Supabase SQL editor AFTER migration 027. Run it promptly when the
-- matching code deploys: the app references jack_messages, and persistence /
-- history degrade gracefully (and self-heal) until both are in place.

ALTER TABLE IF EXISTS public.foreman_messages RENAME TO jack_messages;

ALTER INDEX IF EXISTS idx_foreman_messages_user_time RENAME TO idx_jack_messages_user_time;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jack_messages'
      AND policyname = 'Users manage own foreman messages'
  ) THEN
    ALTER POLICY "Users manage own foreman messages" ON public.jack_messages
      RENAME TO "Users manage own jack messages";
  END IF;
END $$;
