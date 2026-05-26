-- Migration 026: Email click tracking via Resend webhooks.
--
-- Symmetric with migration 025 (opens). Resend rewrites every link in the
-- HTML body to route through its tracking domain when click tracking is
-- enabled at the domain level; clicks then fire email.clicked webhooks
-- that include the original URL.
--
-- Run AFTER migration 025_email_open_tracking.sql.

ALTER TABLE public.crm_activities
  ADD COLUMN IF NOT EXISTS first_clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_clicked_at  timestamptz,
  ADD COLUMN IF NOT EXISTS click_count      int NOT NULL DEFAULT 0;

ALTER TABLE public.crm_campaign_recipients
  ADD COLUMN IF NOT EXISTS first_clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_clicked_at  timestamptz,
  ADD COLUMN IF NOT EXISTS click_count      int NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.crm_email_clicks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_message_id text NOT NULL,
  contractor_id     uuid REFERENCES public.imported_contractors(id)      ON DELETE SET NULL,
  activity_id       uuid REFERENCES public.crm_activities(id)            ON DELETE SET NULL,
  recipient_id      uuid REFERENCES public.crm_campaign_recipients(id)   ON DELETE SET NULL,
  campaign_id       uuid REFERENCES public.crm_campaigns(id)             ON DELETE SET NULL,
  url               text,
  ip                text,
  user_agent        text,
  occurred_at       timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_email_clicks_msg        ON public.crm_email_clicks(resend_message_id);
CREATE INDEX IF NOT EXISTS idx_crm_email_clicks_contractor ON public.crm_email_clicks(contractor_id);
CREATE INDEX IF NOT EXISTS idx_crm_email_clicks_campaign   ON public.crm_email_clicks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_email_clicks_occurred   ON public.crm_email_clicks(occurred_at DESC);

ALTER TABLE public.crm_email_clicks ENABLE ROW LEVEL SECURITY;
