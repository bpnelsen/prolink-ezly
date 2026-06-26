import Link from 'next/link'

/**
 * Algolia-style dark hero with gradient orbs, grid overlay, glass dashboard
 * mockup, and gradient-text headline. Two-column layout on >=lg; the mockup
 * collapses on small screens so the headline + CTAs read clean.
 */
export function Hero() {
  return (
    <section
      className="relative overflow-hidden bg-[#0B0B1F] pt-32 pb-20 sm:pt-36 sm:pb-24 lg:pt-44 lg:pb-32"
      aria-label="Hero"
    >
      {/* Layered gradient orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 80% 20%, rgba(84,104,255,0.30) 0%, transparent 60%), radial-gradient(50% 50% at 20% 80%, rgba(249,115,22,0.18) 0%, transparent 60%), radial-gradient(70% 60% at 50% 100%, rgba(15,58,125,0.45) 0%, transparent 70%)',
        }}
      />
      {/* Subtle dot grid overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Bottom fade into next section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#0B0B1F]"
      />

      <div className="relative z-10 mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 backdrop-blur-md">
            <span className="relative inline-block h-[7px] w-[7px] rounded-full bg-[#5468FF] shadow-[0_0_0_3px_rgba(84,104,255,0.25)]" />
            <span className="text-[12px] font-semibold tracking-wide text-white/80">
              Built for Contractors, by Contractors
            </span>
          </div>
          <h1 className="font-['Inter',sans-serif] text-[clamp(36px,6.2vw,64px)] font-black leading-[1.04] tracking-[-0.02em] text-white">
            Run your business
            <br />
            <span
              className="bg-gradient-to-r from-[#5468FF] via-[#7B8AFF] to-[#F97316] bg-clip-text text-transparent"
            >
              on autopilot.
            </span>
          </h1>
          <p className="mt-6 max-w-[480px] text-[17px] leading-relaxed text-white/65 sm:text-[18px]">
            Scheduling, dispatch, CRM, invoicing, contracts, client portal,
            automations — plus a public website that brings in new leads.
            One platform, end to end.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Link
              href="/signup"
              className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5468FF] to-[#0F3A7D] px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_28px_-4px_rgba(84,104,255,0.55)] ring-1 ring-white/15 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-4px_rgba(84,104,255,0.7)]"
            >
              Start free trial
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-7 py-3.5 text-[15px] font-bold text-white backdrop-blur-md transition-colors hover:border-white/40 hover:bg-white/[0.08]"
            >
              See how it works
            </a>
          </div>

          <p className="mt-7 text-[13px] tracking-wide text-white/75">
            <strong className="font-bold text-white/90">14-day free trial</strong>
            <span className="mx-2 text-white/30">·</span>
            <span>No credit card required</span>
            <span className="mx-2 text-white/30">·</span>
            <span>Cancel anytime</span>
          </p>
        </div>

        {/* Glass dashboard mockup */}
        <div className="relative hidden md:block">
          {/* Glow halo behind card */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-8 rounded-[2rem] opacity-60 blur-3xl"
            style={{
              background:
                'radial-gradient(50% 50% at 50% 50%, rgba(84,104,255,0.5) 0%, transparent 70%)',
            }}
          />

          {/* Floating bottom card */}
          <div className="absolute -bottom-3 -left-3 z-20 hidden items-center gap-2.5 rounded-2xl border border-white/15 bg-white/[0.08] px-3.5 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl xl:flex">
            <div className="text-xl" aria-hidden="true">
              🎉
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/50">New lead</div>
              <div className="text-sm font-extrabold text-[#F97316]">
                $4,200 Roofing Job
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
              <span className="ml-3 text-[10px] font-semibold text-white/40">dashboard.useezly.com</span>
            </div>
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-bold text-white">
                  Good morning, Mike 👋
                </div>
                <div className="text-[11px] text-white/40">Apr 23, 2026</div>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Revenue', val: '$18.4k', delta: '↑ 12% this month', accent: 'text-[#5468FF]' },
                  { label: 'Active Jobs', val: '9', delta: '↑ 3 new', accent: 'text-[#F97316]' },
                  { label: 'Leads', val: '24', delta: '↑ 8 today', accent: 'text-[#5468FF]' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md">
                    <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/40">
                      {s.label}
                    </div>
                    <div className={`text-lg font-extrabold ${s.accent}`}>
                      {s.val}
                    </div>
                    <div className="mt-0.5 text-[9px] font-semibold text-emerald-400">{s.delta}</div>
                  </div>
                ))}
              </div>

              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/50">
                Active Jobs
              </div>
              <div className="mb-4 flex flex-col gap-1.5">
                {[
                  { icon: '🔧', name: 'Johnson Kitchen Reno', desc: 'Due May 2 · $6,400', badge: 'Active', bcls: 'bg-[#5468FF]/15 text-[#5468FF]' },
                  { icon: '🏠', name: 'Smith Roof Repair', desc: 'Due Apr 28 · $2,100', badge: 'Pending', bcls: 'bg-amber-500/20 text-amber-300' },
                  { icon: '⚡', name: 'Garcia Electrical', desc: 'Completed · $3,800', badge: 'Done', bcls: 'bg-emerald-500/20 text-emerald-300' },
                ].map(j => (
                  <div key={j.name} className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[13px]">
                      {j.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-bold text-white">{j.name}</div>
                      <div className="mt-px truncate text-[10px] text-white/45">{j.desc}</div>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${j.bcls}`}>
                      {j.badge}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/50">
                Revenue by Service
              </div>
              {[
                { label: 'Roofing', width: '78%', gradient: 'from-[#5468FF] to-[#7B8AFF]' },
                { label: 'Plumbing', width: '55%', gradient: 'from-[#F97316] to-[#FFB266]' },
                { label: 'Electrical', width: '40%', gradient: 'from-[#0F3A7D] to-[#5468FF]' },
              ].map(r => (
                <div key={r.label} className="mb-2 flex items-center gap-2">
                  <span className="w-14 flex-shrink-0 text-[9px] text-white/45">{r.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className={`h-full rounded-full bg-gradient-to-r ${r.gradient}`} style={{ width: r.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
