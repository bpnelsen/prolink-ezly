-- Migration 014: Contractor <-> client chat + AI deal plan.
-- Run in the Supabase SQL editor AFTER migration 013.
--
-- Design (matches the security model established in migrations 011-013):
--   * Contractors are the only authenticated users. Clients reach a thread
--     through an opaque per-conversation public_token via SECURITY DEFINER
--     RPCs ONLY — there are NO `USING (true)` policies on these tables.
--   * One conversation + one deal_plan per job.
--   * The AI never mutates a deal_plan directly: it writes pending rows to
--     deal_plan_suggestions; the contractor accepts/rejects them.

-- ---------------------------------------------------------------------------
-- conversations  (one per job)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id   UUID NOT NULL REFERENCES public.profiles(id),
  client_id       UUID REFERENCES public.clients(id),
  job_id          UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  public_token    UUID NOT NULL DEFAULT gen_random_uuid(),
  status          TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'archived'
  last_message_at TIMESTAMPTZ,
  last_analyzed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_job        ON public.conversations(job_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_token      ON public.conversations(public_token);
CREATE INDEX        IF NOT EXISTS idx_conversations_contractor ON public.conversations(contractor_id);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_role     TEXT NOT NULL CHECK (sender_role IN ('contractor', 'client', 'system')),
  sender_name     TEXT,
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- deal_plans  (one per job)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deal_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.profiles(id),
  scope                      JSONB NOT NULL DEFAULT '[]'::jsonb,
  pricing                    JSONB NOT NULL DEFAULT '[]'::jsonb,
  schedule                   JSONB NOT NULL DEFAULT '[]'::jsonb,
  decisions                  JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_items               JSONB NOT NULL DEFAULT '[]'::jsonb,
  change_order_opportunities JSONB NOT NULL DEFAULT '[]'::jsonb,
  value_engineering          JSONB NOT NULL DEFAULT '[]'::jsonb,
  upgrade_opportunities      JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_plans_job ON public.deal_plans(job_id);

-- ---------------------------------------------------------------------------
-- deal_plan_suggestions  (the human-in-the-loop queue)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deal_plan_suggestions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_plan_id    UUID NOT NULL REFERENCES public.deal_plans(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  contractor_id   UUID NOT NULL REFERENCES public.profiles(id),
  section         TEXT NOT NULL CHECK (section IN (
                    'scope','pricing','schedule','decisions','action_items',
                    'change_order_opportunities','value_engineering','upgrade_opportunities')),
  operation       TEXT NOT NULL DEFAULT 'add' CHECK (operation IN ('add','update','remove')),
  payload         JSONB NOT NULL,
  rationale       TEXT,
  source_quote    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dps_plan   ON public.deal_plan_suggestions(deal_plan_id, status);
CREATE INDEX IF NOT EXISTS idx_dps_owner  ON public.deal_plan_suggestions(contractor_id);

-- ---------------------------------------------------------------------------
-- RLS — contractor-owner scoped; clients never touch these directly.
-- ---------------------------------------------------------------------------
ALTER TABLE public.conversations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_plans             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_plan_suggestions  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contractors manage own conversations" ON public.conversations;
CREATE POLICY "Contractors manage own conversations" ON public.conversations
  FOR ALL USING (auth.uid() = contractor_id) WITH CHECK (auth.uid() = contractor_id);

DROP POLICY IF EXISTS "Contractors manage own messages" ON public.messages;
CREATE POLICY "Contractors manage own messages" ON public.messages
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.conversations c
                 WHERE c.id = conversation_id AND c.contractor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c
                 WHERE c.id = conversation_id AND c.contractor_id = auth.uid()));

DROP POLICY IF EXISTS "Contractors manage own deal plans" ON public.deal_plans;
CREATE POLICY "Contractors manage own deal plans" ON public.deal_plans
  FOR ALL USING (auth.uid() = contractor_id) WITH CHECK (auth.uid() = contractor_id);

DROP POLICY IF EXISTS "Contractors manage own suggestions" ON public.deal_plan_suggestions;
CREATE POLICY "Contractors manage own suggestions" ON public.deal_plan_suggestions
  FOR ALL USING (auth.uid() = contractor_id) WITH CHECK (auth.uid() = contractor_id);

-- ---------------------------------------------------------------------------
-- Token-scoped client access (SECURITY DEFINER, search_path pinned).
-- A caller can only ever read/write the single conversation whose opaque
-- public_token they hold (UUID — not enumerable).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_client_thread(p_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'conversation', jsonb_build_object(
      'id', cv.id,
      'status', cv.status,
      'business', (
        SELECT jsonb_build_object('business_name', cu.business_name, 'logo_url', cu.logo_url)
        FROM public.profiles pr
        LEFT JOIN public.customers cu ON cu.id = pr.id
        WHERE pr.id = cv.contractor_id
      ),
      'job', (SELECT jsonb_build_object('title', j.title) FROM public.jobs j WHERE j.id = cv.job_id)
    ),
    'messages', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', m.id,
               'sender_role', m.sender_role,
               'sender_name', m.sender_name,
               'body', m.body,
               'created_at', m.created_at
             ) ORDER BY m.created_at)
      FROM public.messages m
      WHERE m.conversation_id = cv.id
    ), '[]'::jsonb)
  )
  FROM public.conversations cv
  WHERE cv.public_token = p_token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.post_client_message(p_token uuid, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conv   public.conversations%ROWTYPE;
  v_name   TEXT;
  v_body   TEXT;
  v_recent INTEGER;
  v_msg    public.messages%ROWTYPE;
BEGIN
  v_body := btrim(COALESCE(p_body, ''));
  IF v_body = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty');
  END IF;
  IF length(v_body) > 4000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'too_long');
  END IF;

  SELECT * INTO v_conv FROM public.conversations WHERE public_token = p_token;
  IF NOT FOUND OR v_conv.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  -- Light abuse guard: cap inbound volume per conversation.
  SELECT count(*) INTO v_recent
  FROM public.messages
  WHERE conversation_id = v_conv.id
    AND sender_role = 'client'
    AND created_at > now() - interval '1 minute';
  IF v_recent >= 30 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  SELECT NULLIF(btrim(concat_ws(' ', cl.first_name, cl.last_name)), '')
    INTO v_name
  FROM public.clients cl WHERE cl.id = v_conv.client_id;

  INSERT INTO public.messages (conversation_id, sender_role, sender_name, body)
  VALUES (v_conv.id, 'client', COALESCE(v_name, 'Client'), v_body)
  RETURNING * INTO v_msg;

  UPDATE public.conversations SET last_message_at = now() WHERE id = v_conv.id;

  RETURN jsonb_build_object(
    'ok', true,
    'message', jsonb_build_object(
      'id', v_msg.id,
      'sender_role', v_msg.sender_role,
      'sender_name', v_msg.sender_name,
      'body', v_msg.body,
      'created_at', v_msg.created_at
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_thread(uuid)        FROM PUBLIC;
REVOKE ALL ON FUNCTION public.post_client_message(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_thread(uuid)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_client_message(uuid, text) TO anon, authenticated;
