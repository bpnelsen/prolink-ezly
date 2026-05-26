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

Been talking with a lot of contractors around {{state}} this month, and three things keep coming up. Curious whether any of these sound familiar:

1) Leads slip. A homeowner calls Tuesday, you promise a quote, and by Friday you can''t remember if you sent it. Most shops I talk to are losing 20–30% of warm leads to follow-up gaps alone — not because the leads were bad, but because nothing was tracking who needed a callback.

2) Estimates eat your evenings. You bid the job during the day, then build the quote in Excel at 9pm. The faster competitor sends theirs the next morning, and you find out two days later that you lost it.

3) Getting paid takes 45+ days. You finish the job clean, email the invoice, then chase it with two calls and a text just to get the check moving. Meanwhile your supplier wants payment by the 15th.

If any of that hits home, I''d be curious how you''ve worked around it — even if you don''t need anything from me. I''m at {{my_email}} if you want to swap notes.

Either way, hope {{business_name}}''s season is going strong.

— {{my_name}}'
  )
ON CONFLICT DO NOTHING;
