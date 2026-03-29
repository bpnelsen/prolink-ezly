# Prolink-EZLY: Master Roadmap

## 🚀 High Priority (Blocking Launch)
- [ ] **Data Migration & RLS:** Connect Live Supabase (`rrpkokhjomvlumreknuq`) + Row Level Security (RLS) policies.
- [ ] **Auth Workflow:** Finalize role-based access for "Contractors" vs "Admin".
- [ ] **Operational Core:** Build the full Job Detail Hub (moving from test data to dynamic data).
- [ ] **Invoicing Engine:** Finish Stripe Connect integration for real payouts.

## 📈 Medium Priority (Scaling/Growth)
- [ ] **SMS/Communication:** Integrate inbound/outbound SMS (Twilio) with job status updates.
- [ ] **Advanced Reporting:** Complete the "Financial dashboard" visualization for Scale-tier users.
- [ ] **Multi-Tier Logic:** Refine the `<FeatureGate>` and Plan system in `lib/plans.ts`.

## 🏗️ Technical / DevOps
- [ ] **Prod Vercel Sync:** Finalize CI/CD pipeline for `prolink-ezly`.
- [ ] **Custom Domain:** Configure `pro.useezly.com` DNS.

## Recently Completed
- ✅ Initial Job Detail Hub UI (CRM/Map/History/Workflow).
- ✅ Stripe/Financial simulation panels.
- ✅ Tiered system (Solo/Team/Scale) framework.
- ✅ Twilio integration verified.
