# Prolink TODO

Action items from the May 21 2026 demo session with Dane Bendixen, prioritized for execution. Each task includes scope, acceptance criteria, and stack notes.

Tasks marked **[Founder]** require human action and are out of scope for Claude Code — listed at the bottom for completeness.

Stack reference: Next.js / TypeScript / Tailwind on the frontend, Express + Supabase (auth, Postgres, storage, realtime) on the backend, Zod for validation, Jest for tests.

---

## P0 — Mobile-first push

Dane's clearest and most repeated feedback: the app is ~80% mobile responsive, and that's not good enough. Field techs and small contractors work from phones. **Fix this before any new feature work.**

### P0.1 — Mobile audit pass
Walk every authenticated route at a 375px viewport. Document layout breaks, overflow issues, untappable controls (<44px touch target), and pages where horizontal scroll appears. Produce `MOBILE_AUDIT.md` before fixing anything.

**Acceptance:** `MOBILE_AUDIT.md` exists with one section per route, issues categorized as critical / medium / cosmetic.

### P0.2 — Fix critical mobile breaks on core flows
In this order:
1. Job detail page
2. Job list / schedule view
3. Estimate creation
4. Customer/contact pages
5. Login + onboarding

Use Tailwind responsive utilities. Eliminate fixed widths. Touch targets ≥44px. Multi-column layouts collapse to stacked on `<md`.

**Acceptance:** Each route passes manual review at iPhone SE (375×667) and Pixel 5 (393×851) viewports.

### P0.3 — PWA shell
Add a PWA manifest, service worker (`next-pwa` or equivalent), and install prompt. Goal: "Add to Home Screen" works on iOS and Android; the app opens in standalone mode.

**Acceptance:** Lighthouse PWA score ≥90; install prompt fires on supported browsers; app launches without browser chrome after install.

---

## P1 — Payments (Stripe Connect)

### P1.1 — Stripe Connect research doc
Read the current Stripe Connect docs and write `docs/stripe-connect.md` covering:
- Which Connect account type fits Prolink (Standard vs Express vs Custom) and why
- Contractor onboarding flow (KYC, account links)
- Payout timing and the "release on proof of completion" pattern (manual capture vs hold + transfer)
- Dispute handling and chargeback exposure
- PCI surface area vs current setup

**No code yet** — this is a decision doc.

**Acceptance:** Doc exists; recommendation is clear; open questions are explicitly flagged.

### P1.2 — Contractor onboarding endpoint
After P1.1, scaffold Connect account creation and the onboarding link flow. Use the latest Stripe SDK. Persist `stripe_account_id` on the contractor record in Supabase.

**Acceptance:** A contractor can complete Stripe onboarding end-to-end from the app; the returned account ID persists to the DB.

### P1.3 — Conditional payout flow
Implement the "release on completion" pattern: customer pays → funds held → contractor marks job complete with photo proof → manual or automatic release to the contractor's connected account.

**Acceptance:** Payment is held until job is marked complete; release transfers funds to the contractor's Connect account.

---

## P2 — Templates & contracts

### P2.1 — Estimate templates
Add a `templates` table in Supabase. Contractors can save a line-item set (with default labor + materials) and reuse it on new estimates. UI: "Save as template" on an existing estimate; "Start from template" on the new-estimate form.

**Acceptance:** A contractor can save an estimate as a template, then start a new estimate from it with all line items prefilled and editable.

### P2.2 — AIA A101 contract renderer
Build a renderer using the AIA A101 stipulated-sum structure. Variables: project name, parties, start/completion dates, contract sum, deposit %, retainage %, scope of work, payment schedule. Render to PDF (`@react-pdf/renderer` server-side, or Puppeteer).

**Important:** Add a clear disclaimer in both the generated PDF and the UI — Prolink is not legal counsel; users should have an attorney review. This was your explicit position on the call.

**Acceptance:** Contract generates as a PDF with all variables substituted; disclaimer is prominent.

---

## P3 — Growth loops

### P3.1 — Referral program
Schema: `referrals` table (`referrer_user_id`, `referred_user_id`, `status`, `reward_applied_at`). Accept referral codes on signup. Reward: extend referrer's trial by 14 days when the referred user converts (configurable in env).

**Status:** Backend complete — migration `022_referrals.sql` and routes `/api/referrals/{me,attribute,fire-reward}` are merged. Reward extends `customers.trial_ends_at` (the column the existing Stripe webhook already manages). The three sub-tasks below complete the loop and are explicitly **deferred** — do not start until the user gives the go-ahead.

#### P3.1a — Settings UI for referral link
In `/settings`, call `GET /api/referrals/me`, render the share URL with a one-click copy button, and display the summary counts (pending / converted / rewarded). Keep it lightweight; no need for a dedicated referrals page yet.

**Acceptance:** A signed-in user can find their referral link in settings and copy it in one click; the three counts render.

#### P3.1b — Signup attribution wire-up
On the signup page, capture `?ref=<code>` from the URL into a short-lived cookie or session before Supabase auth runs. Immediately after the user is created, make a server-to-server `POST /api/referrals/attribute` with `{ referredUserId, referralCode }` and the `x-internal-secret` header. Set `INTERNAL_API_SECRET` in Vercel env.

**Acceptance:** Signups carrying a valid `?ref=` code create a `referrals` row with `status='signed_up'`; the existing signup flow is unchanged for users without a code.

#### P3.1c — Stripe webhook reward trigger
In `src/app/api/stripe/webhook/route.ts`, on the first successful `invoice.payment_succeeded` for a referred user, make a server-to-server `POST /api/referrals/fire-reward` with `{ referredUserId }` and the `x-internal-secret` header. Treat this as best-effort — don't fail the webhook on reward errors.

**Acceptance:** When a referred user's first invoice succeeds, the referrer's `customers.trial_ends_at` is extended by `REFERRAL_TRIAL_EXTENSION_DAYS` (default 14); the matching `referrals` row flips to `status='reward_applied'`.

**Acceptance (overall):** A user can copy their referral link from settings; signups via that link are tracked; reward fires on the referred user's first paid charge.

### P3.2 — Shareable job/estimate links
Public, tokenized URLs for estimates and contracts that customers can view without an account. Adds a soft viral surface and removes friction for customer review.

**Acceptance:** Contractor can generate a share link from any estimate; recipient sees a read-only branded view with no login required.

---

## P4 — Longer horizon (don't start until P0–P2 ship)

### P4.1 — "Jack" AI agent ✅ Shipped
In-app chat agent scoped to the contractor's own data — current jobs, leads,
customer notes. Jack now does Q&A **plus** approval-gated write actions (draft
quotes, customers, jobs), 15-day chat history, and conversation memory. See
`docs/jack.md`. Building code references are still **not** integrated — see P4.2.

### P4.2 — Building code references (research only)
IRC and most building codes are paywalled. Investigate:
- ICC's licensing terms for API/data access (cost, redistribution rights)
- Whether free state/municipal amendments can fill any gaps
- Whether a curated internal knowledge base with proper attribution is legally viable

**Output:** `docs/building-codes.md` with findings. Do not scrape or republish copyrighted code text.

---

## [Founder] — Out of scope for Claude Code

These need human action; listed so they don't get lost:

- **Reach out to Ben** re: sales commission models and intros to software sales professionals.
- **Model unit economics** at 100 / 500 / 1000 customers — spreadsheet or a regular Claude chat, not a repo task.
- **Continue early-access feedback loop** — keep offering free access in exchange for structured feedback; log conversations.
- **Decide long-term sales motion** (PLG vs sales-led vs hybrid) before hiring anyone.

---

## Reference

- **Source:** Zoom call with Dane Bendixen, May 21 2026 (~1hr 11min).
- **Dane's strongest opinion:** mobile-first beats native app. PWA before any iOS/Android build.
- **Current pricing:** $49/mo + $15/seat, 14-day free trial.
- **Target customer:** smaller home-service contractors, not Service Titan-scale operations.
