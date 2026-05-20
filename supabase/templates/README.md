# Prolink-branded Supabase Auth email templates

These HTML files are designed to be pasted into the **Supabase Dashboard**:

> Authentication → Emails → Templates

Supabase renders auth emails (magic link, signup confirmation, password
reset, etc.) from the dashboard, not from this repo, so the templates
here have to be installed manually once per project.

## Install

For each template below, open the matching tab in the dashboard, paste the
HTML into the message body, and set the suggested subject line.

| File                  | Dashboard tab     | Subject suggestion                |
|-----------------------|-------------------|-----------------------------------|
| `magic-link.html`     | Magic Link        | `Sign in to Prolink`              |
| `confirm-signup.html` | Confirm signup    | `Confirm your Prolink account`    |
| `reset-password.html` | Reset Password    | `Reset your Prolink password`     |

## Recommended companion settings

1. **Custom SMTP** — Project Settings → Authentication → SMTP Settings.
   Point at Resend / Postmark / SES with `noreply@<your-domain>` as the
   From address. This stops Gmail flagging the email as "External" and
   removes the `mail.app.supabase.io` sender. Verify SPF, DKIM, DMARC for
   the domain.
2. **Site URL & redirect URLs** — Authentication → URL Configuration.
   Make sure these point at the production Prolink URL so the
   `{{ .ConfirmationURL }}` link resolves correctly.

## What's branded

- Prolink wordmark + navy→teal gradient header (`#0f3a7d` → `#14b8a6`)
- Brand-navy CTA button
- Light grey background + white card with rounded corners + subtle shadow
- Footer reads "Powered by Supabase" but no Supabase logo / lightning
  bolt / "Opt out" Supabase branding
- Table-based layout with inline styles — renders correctly in Gmail,
  Outlook, Apple Mail, and webmail clients
- No external images — the wordmark is styled text, so nothing breaks
  when image loading is blocked
