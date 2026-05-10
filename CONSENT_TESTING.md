# Consent — manual test checklist

## Local

Set the region cookie manually before loading the site to simulate jurisdictions:

```js
// In DevTools console, on the running site
document.cookie = '__consent_region=gdpr; path=/'   // or 'ccpa' or 'default'
document.cookie = '__consent=; path=/; max-age=0'   // clear previous decision
location.reload()
```

For each regime, verify:

- [ ] Banner appears at the bottom with the correct copy
- [ ] **Accept All**, **Reject All**, **Manage Preferences** are the same size and style
- [ ] CCPA banner shows "Do Not Sell or Share My Personal Information"
- [ ] Tabbing through the banner reaches every button; Enter/Space activates
- [ ] Preferences modal traps focus and Esc closes it
- [ ] Necessary toggle is on and disabled; others toggle freely
- [ ] After Reject All: no `googletagmanager.com` request in Network tab
- [ ] After Accept All: GA loads and `gtag('consent','update',{analytics_storage:'granted'})` fires
- [ ] `__consent` cookie is set with `SameSite=Lax; Secure`
- [ ] Refreshing the page does **not** show the banner again

## GPC

Use the [Global Privacy Control extension](https://globalprivacycontrol.org/orgs) or set:

```js
Object.defineProperty(navigator, 'globalPrivacyControl', { value: true })
```

- [ ] CCPA regime: banner is suppressed, toast shows "Opt-out honored", no analytics scripts load
- [ ] GDPR regime: banner is suppressed, no analytics scripts load
- [ ] Default regime: banner still shows (GPC is not legally required outside US state laws / GDPR)

## Policy version drift

- [ ] Bump `POLICY_VERSION` in `src/lib/consent/policy.ts`
- [ ] Reload the site → banner should reappear even if a previous `__consent` cookie exists

## Supabase

- [ ] After making a decision, a new row appears in `consent_logs`
- [ ] `ip_hash` is a 64-char hex string, **not** a raw IP
- [ ] `consent` JSONB matches the decision
- [ ] `gpc_signal` is `true` for auto-opt-outs

## Production VPN spot-checks

- [ ] EU VPN exit (e.g., Germany) → GDPR banner, scripts blocked until accept
- [ ] California exit → CCPA banner with Do Not Sell link
- [ ] New York exit → CCPA banner (NY is not in our list yet — should fall through to default; update list if NY is in scope)

## Accessibility

- [ ] axe DevTools shows no critical issues on banner and modal
- [ ] Screen reader announces banner role/region and modal title
- [ ] Reduced-motion OS setting suppresses fade-in
