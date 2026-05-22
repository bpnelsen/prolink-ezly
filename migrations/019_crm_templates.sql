-- Migration 019: CRM messaging templates + dm activity kind.
--
-- Adds:
--   - crm_templates: stored email + LinkedIn-DM templates with mustache-style
--     {{variable}} substitution rendered server-side from the
--     imported_contractors row + the sending admin's identity.
--   - 'dm' kind on crm_activities (LinkedIn / social direct messages —
--     copy-to-clipboard from the CRM, manually pasted into LinkedIn).
--     'sms' remains in the kind list for any future Twilio work.
--
-- Run AFTER migration 018.

-- ---------------------------------------------------------------------------
-- 1. Add 'dm' to the activity-kind check constraint
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.crm_activities DROP CONSTRAINT IF EXISTS crm_activities_kind_check;
  ALTER TABLE public.crm_activities
    ADD CONSTRAINT crm_activities_kind_check
    CHECK (kind IN ('note', 'call', 'email', 'sms', 'dm', 'task', 'meeting'));
END $$;

-- ---------------------------------------------------------------------------
-- 2. Templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_templates (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind               text NOT NULL CHECK (kind IN ('email', 'dm')),
  name               text NOT NULL,
  subject            text,                 -- email only
  body               text NOT NULL,
  created_by_email   text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_templates_kind ON public.crm_templates(kind);
CREATE INDEX IF NOT EXISTS idx_crm_templates_name ON public.crm_templates(name);

DROP TRIGGER IF EXISTS trg_crm_templates_updated_at ON public.crm_templates;
CREATE TRIGGER trg_crm_templates_updated_at
  BEFORE UPDATE ON public.crm_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed a starter pair so the templates page isn't empty on first load.
INSERT INTO public.crm_templates (kind, name, subject, body) VALUES
  (
    'email',
    'Cold outreach (intro)',
    'Quick question, {{business_name}}',
    'Hi {{business_name}} team,

I came across your business while researching contractors in {{city}}, {{state}}. We''re building Prolink — a tool that helps shops like yours win and manage more jobs without the admin overhead.

Worth a 15-minute call to see if it''s a fit?

Thanks,
{{my_name}}'
  ),
  (
    'dm',
    'LinkedIn — first touch',
    NULL,
    'Hey — saw your {{business_name}} profile and the work you''re doing in {{city}}. Quick question: are you currently using a CRM to manage your leads/jobs? Happy to share what we''ve built at Prolink if you''re open to a chat.'
  )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Lock down — same pattern as 018 (service-role-only behind requireAdmin)
-- ---------------------------------------------------------------------------
ALTER TABLE public.crm_templates ENABLE ROW LEVEL SECURITY;
