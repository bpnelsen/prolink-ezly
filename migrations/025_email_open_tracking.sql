-- Migration 025: Email open tracking via Resend webhooks.
--
-- Adds the columns needed to record opens on both single-send emails
-- (crm_activities) and mass-campaign sends (crm_campaign_recipients),
-- plus a raw event log table for the audit trail.
--
-- Resend's open tracking embeds a 1x1 pixel in the HTML body; opens fire
-- a webhook event with the email_id we already capture as resend_message_id.
-- Note: Apple Mail (iOS 15+) pre-fetches images on the device, so opens
-- from Apple Mail recipients fire automatically regardless of whether the
-- user actually looked at the email. Treat tracked opens as directional.
--
-- Run AFTER migrations 019_crm_templates.sql and 024_crm_campaigns.sql.

-- ---------------------------------------------------------------------------
-- 1. Tracking columns on crm_activities (single-send emails)
-- ---------------------------------------------------------------------------
ALTER TABLE public.crm_activities
  ADD COLUMN IF NOT EXISTS resend_message_id text,
  ADD COLUMN IF NOT EXISTS first_opened_at   timestamptz,
  ADD COLUMN IF NOT EXISTS last_opened_at    timestamptz,
  ADD COLUMN IF NOT EXISTS open_count        int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_crm_activities_resend_msg ON public.crm_activities(resend_message_id)
  WHERE resend_message_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Tracking columns on crm_campaign_recipients (campaign sends)
-- ---------------------------------------------------------------------------
ALTER TABLE public.crm_campaign_recipients
  ADD COLUMN IF NOT EXISTS first_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_opened_at  timestamptz,
  ADD COLUMN IF NOT EXISTS open_count      int NOT NULL DEFAULT 0;

-- resend_message_id index already exists from migration 024 (via constraint
-- on the column being indexable). Add an explicit lookup index in case
-- it doesn't.
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_resend_msg
  ON public.crm_campaign_recipients(resend_message_id)
  WHERE resend_message_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Raw event log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_email_opens (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_message_id text NOT NULL,
  contractor_id     uuid REFERENCES public.imported_contractors(id) ON DELETE SET NULL,
  activity_id       uuid REFERENCES public.crm_activities(id)        ON DELETE SET NULL,
  recipient_id      uuid REFERENCES public.crm_campaign_recipients(id) ON DELETE SET NULL,
  campaign_id       uuid REFERENCES public.crm_campaigns(id)         ON DELETE SET NULL,
  ip                text,
  user_agent        text,
  occurred_at       timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_email_opens_msg        ON public.crm_email_opens(resend_message_id);
CREATE INDEX IF NOT EXISTS idx_crm_email_opens_contractor ON public.crm_email_opens(contractor_id);
CREATE INDEX IF NOT EXISTS idx_crm_email_opens_campaign   ON public.crm_email_opens(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_email_opens_occurred   ON public.crm_email_opens(occurred_at DESC);

ALTER TABLE public.crm_email_opens ENABLE ROW LEVEL SECURITY;
