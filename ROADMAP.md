# Prolink-EZLY: Master Roadmap
*Updated: March 28, 2026*

## ✅ Completed
- [x] **Job Detail Hub UI** — Two-column layout (CRM/Map/History + Workflow Engine)
- [x] **Supabase Connection** — Live DB connected, env vars on Vercel
- [x] **Feature Gates** — Solo/Team/Scale tiers with `<FeatureGate>` component
- [x] **Auth Workflow** — Signup, Login, AuthContext, AuthGuard, role-based access
- [x] **RLS Policies** — jobs, job_contractors, reschedule_requests, profiles locked down
- [x] **Job Bidding Model** — junction table, invite/bid/assign flow, 3-day decline visibility
- [x] **Settings Pages** — Profile, Notifications, Enterprise (all with back buttons)
- [x] **Twilio Verified** — SMS send working
- [x] **Vercel Deployment** — CI/CD pipeline via GitHub push

## 🚀 High Priority (Next Up)
- [ ] **Stripe Connect** — Invoicing engine, contractor payouts
- [ ] **SMS Integration** — Wire Twilio into job status updates (invite, assigned, reschedule)
- [ ] **Custom Domain** — Configure `pro.useezly.com` DNS on Vercel

## 📈 Medium Priority (Scaling/Growth)
- [ ] **Advanced Reporting** — Financial dashboards for Scale-tier users
- [ ] **Contractor Browse** — Higher-tier plan lets contractors see all available jobs (not just invited)
- [ ] **Notification System** — In-app notifications + email digests

## 🏗️ Technical / DevOps
- [ ] **Supabase Service Role Key** — Add to Vercel for server-side operations
- [ ] **Error Handling** — Global error boundaries + toast notifications
- [ ] **Testing** — Unit tests for auth flow + RLS policy verification

## 💡 Future Ideas
- [ ] **Ezly (useezly.com)** — Homeowner-facing site (separate codebase)
- [ ] **Consultation Fee** — Optional site visit charge with transparent advisory banners
- [ ] **Inspection Requests** — Optional, fee-based
