-- Migration 024: CRM mass-email campaigns.
--
-- Adds:
--   crm_campaigns           - one row per blast: name, subject/body snapshot,
--                             optional source template, filter criteria,
--                             status, totals, timestamps
--   crm_campaign_recipients - one row per (campaign × contractor): per-recipient
--                             send status, unsubscribe token, Resend message id
--
-- Same lock-down pattern as 018/019: RLS on, no permissive policies — every
-- read/write goes through service-role API routes behind requireAdmin().
--
-- Run AFTER migration 019_crm_templates.sql.

CREATE TABLE IF NOT EXISTS public.crm_campaigns (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  subject           text NOT NULL,
  body              text NOT NULL,                      -- snapshot at send time
  template_id       uuid REFERENCES public.crm_templates(id) ON DELETE SET NULL,
  filter_json       jsonb NOT NULL DEFAULT '{}'::jsonb, -- the recipient filter used
  status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'sending', 'done', 'cancelled')),
  total_recipients  int  NOT NULL DEFAULT 0,
  sent_count        int  NOT NULL DEFAULT 0,
  failed_count      int  NOT NULL DEFAULT 0,
  skipped_count     int  NOT NULL DEFAULT 0,
  created_by_email  text,
  started_at        timestamptz,
  finished_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_campaigns_status  ON public.crm_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_created ON public.crm_campaigns(created_at DESC);

DROP TRIGGER IF EXISTS trg_crm_campaigns_updated_at ON public.crm_campaigns;
CREATE TRIGGER trg_crm_campaigns_updated_at
  BEFORE UPDATE ON public.crm_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.crm_campaign_recipients (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       uuid NOT NULL REFERENCES public.crm_campaigns(id) ON DELETE CASCADE,
  contractor_id     uuid NOT NULL REFERENCES public.imported_contractors(id) ON DELETE CASCADE,
  email             text NOT NULL,
  status            text NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued', 'sent', 'failed',
                                        'skipped_dnc', 'skipped_no_email',
                                        'unsubscribed')),
  error_msg         text,
  resend_message_id text,
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  sent_at           timestamptz,
  unsubscribed_at   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, contractor_id),
  UNIQUE (unsubscribe_token)
);

CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_campaign   ON public.crm_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_contractor ON public.crm_campaign_recipients(contractor_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_token      ON public.crm_campaign_recipients(unsubscribe_token);

ALTER TABLE public.crm_campaigns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_campaign_recipients ENABLE ROW LEVEL SECURITY;
