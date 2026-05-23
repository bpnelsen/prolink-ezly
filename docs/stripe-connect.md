# Stripe Connect — Decision Doc

Decision doc to unblock P1 implementation in `TODO.md`. Recommendation up top; reasoning, alternatives, and open questions below.

---

## TL;DR Recommendation

| Decision | Choice |
|---|---|
| Account type | **Express** (with eye on Accounts v2 migration) |
| Charge pattern | **Separate charges and transfers** |
| Payment hold | **Hold on platform balance** until job completion, then `Transfer` to contractor |
| API version | **Accounts v2** for new code; v1 acceptable if SDK ergonomics force it |
| Platform fee model | **No application fee.** Prolink's revenue is the SaaS subscription ($49/mo + $15/seat); per-job payments flow through with only Stripe processing fees deducted. |
| Dispute & refund handling | **Stripe Connect defaults.** No custom dispute-window hold buffer; standard chargeback + refund flow via Stripe. |

**Why:** Express minimizes contractor onboarding friction (Stripe-hosted KYC, 10-15 min) while Prolink retains control over payout timing — which is exactly what the "release on proof of completion" pattern requires. Separate charges and transfers is the only pattern that lets Prolink hold funds on its own balance and release on a Prolink-defined trigger (job completion + photo proof).

---

## Decision 1 — Account type: Express

### Options

**Standard** — Contractor creates their own Stripe account, connects via OAuth. They get the full Stripe Dashboard, can disconnect anytime, and Stripe handles all compliance and support.
- ✗ Onboarding friction is real: small home-service contractors don't want a separate Stripe account to manage.
- ✗ Contractors interact with Stripe directly for issues — Prolink loses the relationship.
- ✓ Lowest integration effort and no per-account Stripe fee.

**Express** — Stripe-hosted onboarding inside Prolink's flow. Contractor sees a lighter "Express Dashboard." Prolink controls payout schedule and branding; Stripe handles compliance.
- ✓ Fast onboarding (10–15 min, Stripe-hosted KYC).
- ✓ Prolink controls payout timing → required for hold-and-release.
- ✓ Stripe absorbs compliance updates automatically.
- ✗ Per-account fee on top of processing fees (factor into unit economics).

**Custom** — Full white-label. Prolink builds the entire onboarding UI and owns all compliance updates over time.
- ✗ Major engineering and ongoing compliance burden.
- ✗ Higher per-account fee than Express.
- ✓ Maximum control, but Prolink doesn't need it at this stage.

### Pick: **Express.**

Standard is tempting for speed but Dane's framing — small contractors, mobile-first, low tech tolerance — means a separate Stripe Dashboard is the wrong UX. Custom is over-engineering for a pre-PMF product.

### Migration note
Stripe now recommends thinking in **controller properties** (Accounts v2) rather than picking a fixed type. The Express/Standard/Custom mental model still applies — it describes Stripe-hosted vs OAuth vs fully-custom onboarding experiences — but the underlying Account object is unified. New code should use the v2 API surface where supported. See Decision 4.

---

## Decision 2 — Charge pattern: Separate charges and transfers

Stripe Connect offers three charge patterns. The "release on proof of completion" requirement narrows the choice immediately.

### Options

**Direct charges** — Charge happens on the connected account; Prolink takes an application fee. Funds land in the contractor's Stripe balance immediately.
- ✗ Can't hold funds. Charge → connected account balance is automatic. No release trigger available.
- ✓ Simplest pattern, cleanest 1099 story for contractors.

**Destination charges** — Charge happens on Prolink's account, with funds automatically transferred to the contractor at capture time. Application fee deducted in-flight.
- ✗ Auto-transfer at capture means funds leave Prolink's balance immediately. Doesn't support release-on-completion without extra hops.
- ✓ Standard marketplace pattern (DoorDash-style).

**Separate charges and transfers** — Charge to Prolink's platform account, then issue a `Transfer` to the contractor's connected account whenever Prolink decides (manually, on webhook, etc.).
- ✓ Funds stay on Prolink's balance until release trigger fires.
- ✓ Prolink can split a single payment across multiple contractors if a job involves subs.
- ✓ Plays cleanly with job-completion + photo-proof webhooks.
- ✗ Prolink is merchant of record → owns chargebacks and refund flow.
- ✗ More moving parts; need to be careful with cross-border transfers (US/CA/UK/EEA/CH only).

### Pick: **Separate charges and transfers.**

This is the only pattern that natively supports "customer pays → hold → release on completion." Stripe explicitly calls this out as the right model for on-demand services platforms where the marketplace waits for service completion before paying out the provider.

### Important note on "escrow"
Stripe is explicit: **they do not provide escrow accounts.** Holding funds on Prolink's balance is "escrow-like behavior" but not legally escrow. Disclose this clearly in Prolink's contractor and customer terms — do not market this feature as "escrow" in any user-facing copy.

---

## Decision 3 — Payment hold mechanism

Two real options for the hold itself:

**A. Hold on platform balance (recommended)**
- Customer pays → charge lands in Prolink's platform balance.
- Funds sit in Prolink's balance until job completion event fires.
- On completion, Prolink issues a `Transfer` to the contractor's connected account.
- Contractor's payout from their connected balance follows their own payout schedule (or manual payout, see below).

**B. Manual capture (authorization hold)**
- Customer's card is authorized at job booking but not captured.
- Capture must occur within 7 days (most card networks) — too short for most construction/service jobs.
- Use case: same-day quotes or pre-paid bookings only. Not viable as the primary hold pattern for Prolink.

**Pick: A.** Combine with Express connected accounts on a **manual** payout schedule if Prolink wants additional control over when contractor funds leave the Stripe ecosystem (e.g., dispute-window buffer). Note: manual payouts cap holds at 90 days.

### Bonus: Funds segregation (private preview)
Stripe has a private-preview feature called **funds segregation** that puts payment funds in a protected holding state on the platform balance, isolated from operational use. This is exactly the protection Prolink wants. **Action item:** contact Stripe account manager to request access once Prolink is processing real volume.

---

## Decision 4 — API version

Stripe shipped **Accounts v2** (current as of Apr 2026), built around a unified Account with configurations (merchant, customer, recipient). This is the recommended path for new Connect integrations.

| Path | Use when |
|---|---|
| Accounts v2 (`/v2/core/accounts`) | New code, new accounts, want forward compatibility |
| Accounts v1 (`/v1/accounts`) | Mature SDK helpers Prolink wants to use that don't yet support v2 |

**Pick v2** as the default, but confirm SDK support for v2 in the Node Stripe library before committing. If v2 ergonomics aren't there yet in the SDK, v1 with `type=express` is still fully supported.

**Verification step before coding:** Pin the Stripe API version explicitly in the SDK config (e.g. `2026-04-22.dahlia`) and document the version in this repo so upgrades are deliberate.

---

## Money flow diagram (Prolink target state)

```
Customer
   │  pays $X (via Checkout or PaymentIntent)
   ▼
Prolink platform balance  ───────── allocated_funds: true (funds segregation, when available)
   │
   │  [HOLD]   waiting for job_completed webhook
   │           triggered by contractor marking job done + uploading photo proof
   │           + optional Prolink admin review
   ▼
Transfer($X) → Contractor's Express connected account     (no platform fee)
   │
   ▼
Payout to contractor's bank (per Express payout schedule, or manual)
```

---

## What this means for the Prolink schema

New fields (approximate — refine in P1.2):

```
contractor
  └─ stripe_account_id (text)            -- Express connected account id
  └─ stripe_account_status (enum)        -- pending | onboarded | restricted
  └─ stripe_charges_enabled (bool)
  └─ stripe_payouts_enabled (bool)

job
  └─ stripe_payment_intent_id (text)
  └─ payment_status (enum)               -- pending | held | released | refunded | failed
  └─ payment_held_at (timestamptz)
  └─ payment_released_at (timestamptz)
  └─ completion_proof_url (text)         -- Supabase storage path

job_payment_event   -- new table, append-only audit
  └─ id, job_id, event_type, stripe_object_id, payload (jsonb), created_at
```

---

## PCI & compliance posture

- **Never touch raw card data.** Use Stripe Elements / Checkout / PaymentSheet on the client. Card data goes directly from the customer's browser to Stripe; Prolink's servers see only tokens. This keeps Prolink on **SAQ A** (the lightest PCI self-assessment).
- **Pin SDK version** in `package.json` and run dependency updates on a schedule. Dane's PCI point — Stripe's APIs evolve; staying current matters.
- **Webhook signature verification** is non-negotiable. Use Stripe's library; never hand-roll.
- **Idempotency keys** on every mutating call. Job completion is the high-stakes trigger; a duplicate transfer is real money lost.

---

## Open questions

### Resolved (May 2026)

1. **Application fee model — RESOLVED: none.** Prolink does not take a cut of per-job payments. Revenue stays on the SaaS subscription line ($49/mo + $15/seat). Per-job money flows through the platform balance and out to the contractor with only Stripe's processing fees deducted. Revisit only if/when payment volume itself becomes the bottleneck on unit economics.
2. **Dispute window — RESOLVED: Stripe defaults.** No custom hold buffer between job completion and `Transfer` to the contractor. Disputes/chargebacks follow Stripe's standard flow against Prolink's platform balance (Prolink is merchant of record under separate charges and transfers). If chargeback losses become a real cost center, revisit by switching Express accounts to a manual payout schedule and adding a configurable hold-before-transfer window.
3. **Refund policy — RESOLVED: Stripe defaults.** Pre-release: standard `refund.create` against the charge. Post-release: standard `transfer.createReversal` to pull funds back from the contractor's connected balance, then `refund.create`. No bespoke timing windows or eligibility rules.

### Still open

4. **Multi-contractor jobs.** Does a single job ever split payment across multiple contractors / subs? Affects whether `Transfer` is 1:1 or 1:N per payment.
5. **International contractors.** Prolink's target is US small contractors initially. Confirm — separate-charges-and-transfers cross-border support is limited (US/CA/UK/EEA/CH).
6. **Tax forms.** Express handles 1099-K for US sellers automatically when annual thresholds are met. Confirm Prolink's role here is just providing accurate metadata.

---

## Next action

Open questions 1–3 are resolved (May 2026). The remaining open items (4–6) don't block P1.2; they can be answered as the implementation progresses. Proceed to `P1.2 — Contractor onboarding endpoint`.

---

## References

- Stripe Connect account types: https://docs.stripe.com/connect/accounts
- Separate charges and transfers: https://docs.stripe.com/connect/separate-charges-and-transfers
- Account balances and holding funds: https://docs.stripe.com/connect/account-balances
- Funds segregation (private preview): https://docs.stripe.com/connect/funds-segregation
- Manual payouts: https://docs.stripe.com/connect/manual-payouts
- Accounts v2 API: https://docs.stripe.com/api/accounts
