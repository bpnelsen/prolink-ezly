# Jack — the in-app AI assistant

Jack is the contractor-facing AI assistant embedded in the Prolink app. It's a
job-site advisor that also takes real actions in the contractor's account
(drafting quotes, creating customers and jobs) — every action gated behind
explicit approval.

> Jack was formerly branded "Prolink Foreman." The name changed; his *trade* is
> still "a veteran construction foreman" (that's his persona, not his name).

---

## Where it lives

| Piece | Path | Role |
|-------|------|------|
| Widget UI | `src/components/Jack.tsx` | Floating bottom-right chat panel |
| Mount/gate | `src/components/JackWrapper.tsx` | Renders Jack only for authenticated users; hidden on `/crm*` |
| Layout mount | `src/app/layout.tsx` | Mounts `<JackWrapper />` globally |
| Chat API | `src/app/api/jack/route.ts` | `POST` chat (+ tool-calls) and `GET` 15-day history |
| Action API | `src/app/api/jack/action/route.ts` | Executes an approved action (the write path) |
| Tools/logic | `src/app/api/jack/tools.ts` | Tool definitions, customer resolution, totals, write executor |

The widget is a floating button (bottom-right). It's hidden on the sales CRM
(`/crm*`) — Jack is for the contractor app only.

---

## Model & configuration

- **Provider/model:** `google/gemini-3.1-flash-lite-preview` via OpenRouter
  (OpenAI-compatible `chat/completions`). Same provider the website builder uses.
- **Why OpenRouter:** one key, OpenAI-compatible tool-calling.

### Environment variables

| Var | Purpose |
|-----|---------|
| `OPENROUTER_API_KEY` | Required for live responses. If missing, Jack returns an "offline" message and still saves messages. |
| `NEXT_PUBLIC_SITE_URL` | Sent as OpenRouter `HTTP-Referer` (defaults to `https://app.useezly.com`). |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth + RLS-scoped reads/writes. |
| `SUPABASE_SERVICE_ROLE_KEY` | Used by server-auth helpers. |

---

## Capabilities

### 1. Job-site advice
Code questions (IRC/NEC/UPC/OSHA), quote reviews, trade specifics, customer
de-escalation, profit-margin guidance. The system prompt (single source of
truth in `src/app/api/jack/route.ts`) defines the veteran-foreman persona.

### 2. Conversation memory
Each request sends the recent turns (~12) to the model, so follow-up questions
stay coherent within a session. The canned greeting is excluded from context.

### 3. Persistence & History
- Every user message and Jack reply is saved **server-side**, scoped to the
  user via RLS, in the **`jack_messages`** table.
- The **History** button loads the last **15 days** (oldest → newest) into the
  panel via `GET /api/jack`.
- Persistence is best-effort: a logging failure never breaks chat.

### 4. Business context
The **Refresh Data** button pulls the contractor's top 3 active jobs and lead
count from `pl_pipelines` and injects it into the next question — but it's kept
**out of** the saved history so the log stays clean.

### 5. Read tools
Some tools run server-side and feed their result back to the model so Jack can
answer from live data (a short multi-step loop, capped at `MAX_STEPS`).

| Tool | Reads | Notes |
|------|-------|-------|
| `get_schedule` | `jobs` (scheduled in a date range) | Answers schedule/calendar questions. Defaults to the next 14 days. |
| `get_material_prices` | `materials` + recent `invoice_line_items` | The contractor's own price book and past-quote rates. Jack calls this before quoting so prices match how the contractor prices. |

The current date is injected each turn so Jack resolves "today / tomorrow / next
Tuesday" correctly.

### 6. Write actions (approval-gated)
Jack can take actions via OpenRouter function-calling. It never writes directly:
a write tool-call becomes a **Proposal**, the widget shows an **Approve / Cancel**
card, and only on approval does `POST /api/jack/action` write.

| Tool | Writes to | Notes |
|------|-----------|-------|
| `create_quote` | `invoices` (status `draft`) + `invoice_line_items` | Quotes are draft invoices. Optionally creates/attaches a customer/job. |
| `update_quote` | `invoices` + `invoice_line_items` | Edits an existing **draft** quote (drafts only). Replaces the full line-item set; recomputes totals. |
| `create_customer` | `clients` | New customer record. |
| `update_customer` | `clients` | Updates an existing customer's phone/email/address/name. |
| `create_job` | `jobs` | New job for an existing customer. |
| `schedule_job` | `jobs` (`scheduled_start` / `scheduled_end`) | Schedules or reschedules a job. Default duration 2h. |
| `add_material` | `materials` | Adds an item + standard price to the contractor's price book. |
| `refill_price_book` | `materials` | Bulk-adds items from past quotes (most recent rate, skips existing). Also a button on Settings → Price Book. |

> Line items are written with **both** column conventions the table requires
> (`qty`+`quantity`, `rate`+`unit_price`, `amount`+`total`, `position`+`sort_order`),
> matching the manual invoice form.

Before finalizing a quote, Jack proactively asks about commonly-missed items
(disposal/haul fees, small parts, permits, tax) — then calls the tool.

**Approval flow**
1. Contractor asks Jack to do something (e.g. "add this quote to Mike Jones").
2. Model emits a tool-call; the server resolves the customer against the
   contractor's own `clients` (RLS-scoped) — never writing.
3. If the customer is unique → a Proposal is returned. If ambiguous/missing →
   Jack asks the contractor to confirm or offers to create them.
4. The widget renders the Proposal (quotes show a line-item preview + total).
5. On **Approve**, `POST /api/jack/action` writes the records and logs a
   summary back into Jack history.

---

## Security model

- **Auth:** every `/api/jack*` call requires a valid Supabase JWT (`requireUser`).
- **RLS:** all reads/writes use the caller's RLS-scoped client; rows are scoped
  to `auth.uid()`.
- **Server-authoritative writes:** the action endpoint **recomputes quote
  totals** and **re-verifies ownership** of any referenced customer/job — a
  tampered payload can't write outside the caller's account or fake amounts.
- **Draft-only:** Jack creates `draft` invoices; it never sends invoices or
  takes payments.
- **Rate limit:** 20 requests / 60s per user (in-memory; needs Redis for
  multi-region scale).
- **Input cap:** 8,000 characters per prompt.
- **Error hygiene:** upstream OpenRouter error bodies are logged server-side
  only, never returned to the client.

---

## Database

| Table | Used for |
|-------|----------|
| `jack_messages` | Jack's per-user chat history (migrations 027 create, 028 rename) |
| `invoices` / `invoice_line_items` | Draft quotes created by `create_quote` |
| `clients` | Customers (resolution + `create_customer`) |
| `jobs` | Jobs (`create_job`, `schedule_job`, quote attachment) |
| `materials` | Per-contractor price book (migration 029); read for quoting, written by `add_material` |
| `pl_pipelines` | Business-context summary (Refresh Data) |

### Migrations
- **027** `migrations/027_foreman_chat_history.sql` — creates the history table
  (originally `foreman_messages`).
- **028** `migrations/028_rename_foreman_messages_to_jack.sql` — renames it to
  `jack_messages` (preserves rows; renames index + RLS policy). **Run this in
  the Supabase SQL editor** for any environment that ran 027.
- **029** `migrations/029_materials_price_book.sql` — creates the `materials`
  price-book table (owner-scoped RLS). **Run in the Supabase SQL editor** to
  enable pricing.

---

## Known limits / next steps
- Pricing draws on the contractor's price book + past quotes; items not found
  there fall back to a model estimate (flagged). No live retail/material pricing
  API yet (Home Depot/RSMeans etc. are paid/scraped — deferred).
- The price book is managed at **Settings → Price Book** (`/settings/price-list`)
  — add/edit/delete plus "Refill from past quotes" — and via Jack
  (`add_material` / `refill_price_book`).
- `schedule_job` writes times in UTC; no per-contractor timezone handling yet.
- No document/photo uploads.
- In-memory rate limiter is single-region.
- Building-code citations are general knowledge only — see `TODO.md` P4.2 and
  `docs/building-codes.md` for the (deferred) authoritative-source research.
