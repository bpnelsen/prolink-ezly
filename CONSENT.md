# Consent system

A region-aware cookie consent banner. No external CMP — we own the data.

## How it works

1. `middleware.ts` (Edge) reads `x-vercel-ip-country` / `x-vercel-ip-country-region` and writes a `__consent_region` cookie (`gdpr | ccpa | default`).
2. `src/app/layout.tsx` reads that cookie server-side and passes it to `<ConsentProvider initialRegime>` — no flash on first paint.
3. `<CookieBanner />` renders the regime-appropriate variant and writes a `__consent` cookie + posts to `/api/consent` (Supabase audit log).
4. `<ConsentGate category="analytics">` wraps any `<Script>` that requires consent and only renders it after the visitor opts in.
5. Google Consent Mode v2 default signals are emitted `beforeInteractive`; `gtag('consent','update',...)` is emitted on every decision.
6. Global Privacy Control (`navigator.globalPrivacyControl === true`) auto-opts-out in CCPA jurisdictions (with a toast) and acts as a reject-all in GDPR.

## Adding a new tracking script

```tsx
import { ConsentGate } from '@/components/consent/ConsentGate'
import Script from 'next/script'

<ConsentGate category="marketing">
  <Script src="https://example.com/pixel.js" strategy="afterInteractive" />
</ConsentGate>
```

Pick the category that best matches the script's purpose. `necessary` scripts do **not** need a gate.

## Bumping the policy version

Edit `src/lib/consent/policy.ts`:

```ts
export const POLICY_VERSION = '1.1.0' // was '1.0.0'
```

Every visitor's existing `__consent` cookie becomes invalid the next time they load the site, the banner re-appears, and a new row is written to `consent_logs`.

Bump `UI_VERSION` separately when you change banner copy/layout but not the underlying policy.

## Adding a jurisdiction

Edit `src/lib/regions.ts`:

- GDPR-equivalent country → add the ISO-3166-1 alpha-2 code to `GDPR_COUNTRIES`.
- New US state privacy law → add the state code to `US_STATE_PRIVACY_LAWS`.
- Anything more complex (e.g., Brazil's LGPD as its own regime) → extend the `Regime` type in `src/lib/consent/types.ts` and update banner copy in `CookieBanner.tsx`.

## Operational runbook

### Query consent logs

```sql
-- Most recent decision per anonymous_id
select distinct on (anonymous_id)
  anonymous_id, created_at, regime, consent, gpc_signal, policy_version
from consent_logs
order by anonymous_id, created_at desc;
```

### Honor a deletion request

Given an `anonymous_id` (the visitor's localStorage UUID) or a `user_id`:

```sql
delete from consent_logs where anonymous_id = $1;
-- or
delete from consent_logs where user_id = $1;
```

We never store raw IPs — only `sha256(salt + ip)` — so there is no IP backfill to scrub.

### Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, used by `/api/consent`
- `CONSENT_IP_SALT` — random string used to hash IPs; rotate to invalidate all historical hashes
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` — optional; GA is gated automatically when present

## Files

```
middleware.ts                                  # Region detection
migrations/009_consent_logs.sql                # Supabase schema
src/lib/regions.ts                             # Country/region → regime map
src/lib/consent/{types,policy,storage,gpc}.ts  # Core
src/components/consent/                        # UI + provider + gate
src/hooks/useConsent.ts
src/app/api/consent/route.ts
src/app/api/consent/policy-version/route.ts
src/app/cookie-preferences/page.tsx
src/app/cookie-policy/page.tsx                 # LEGAL REVIEW NEEDED
```
