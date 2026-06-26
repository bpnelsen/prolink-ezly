-- Migration 027: Foreman AI chat history (persistence).
--
-- Backs the "History" button in the Foreman widget. Every user message and
-- Foreman reply is written here server-side from /api/foreman, scoped to the
-- authenticated user via RLS. The widget loads the last 15 days on demand.
--
-- Unlike migration 014 (contractor <-> client job chat), this is the
-- contractor's PRIVATE assistant log: one flat per-user stream, no public
-- token, no client access path.
--
-- Run in the Supabase SQL editor AFTER migration 026.

CREATE TABLE IF NOT EXISTS public.foreman_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'ai')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary access pattern: a user's stream, newest-first, windowed by date.
CREATE INDEX IF NOT EXISTS idx_foreman_messages_user_time
  ON public.foreman_messages(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS — owner-scoped. A user can only ever see/write their own Foreman log.
-- ---------------------------------------------------------------------------
ALTER TABLE public.foreman_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own foreman messages" ON public.foreman_messages;
CREATE POLICY "Users manage own foreman messages" ON public.foreman_messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
