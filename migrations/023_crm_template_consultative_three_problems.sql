-- Migration 023: Seed a new consultative outreach email template.
--
-- "Three problems" framing: the sender positions as an industry observer
-- rather than a vendor. Each of the three pain points implicitly hints at a
-- Prolink feature (pipeline/CRM, fast estimates, invoicing + payments)
-- without naming the product or asking for a demo. The CTA is "swap notes,"
-- not "book a meeting" — keeps the tone consultative.
--
-- Run AFTER migration 019_crm_templates.sql.

INSERT INTO public.crm_templates (kind, name, subject, body) VALUES
  (
    'email',
    'Consultative — three problems',
    'Three things I keep hearing from {{state}} contractors',
    'Hey {{business_name}} team,

Been talking with contractors around {{state}} lately. Three things keep coming up — curious if any sound familiar:

1) Leads slip. Homeowner calls Tuesday, you promise a quote, by Friday you can''t remember if you sent it.

2) Estimates eat your evenings. You bid during the day, build the quote in Excel at 9pm — the faster competitor wins.

3) Invoices sit. You finish clean, email the invoice, then chase it with calls and texts to get the check moving.

If any of that hits, I''d be curious how you''ve worked around it. Reply here or grab me at {{my_email}}.

— {{my_name}}'
  )
ON CONFLICT DO NOTHING;
