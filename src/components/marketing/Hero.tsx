import Link from 'next/link'

/**
 * Hero section for the marketing homepage. Two-column layout on >= lg
 * with the dashboard mockup on the right, single-column on mobile/tablet
 * where the mockup is hidden so the headline + CTAs read clean on small
 * screens without overlapping the busy mockup graphics.
 */
export function Hero() {
  return (
    <section
      className="relative overflow-hidden bg-[#0F3A7D] pt-32 pb-16 sm:pt-36 sm:pb-20 lg:pt-44 lg:pb-24"
      aria-label="Hero"
    >
      {/* Decorative radial glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 70% at 80% 50%, rgba(20,184,166,.12) 0%, transparent 60%), radial-gradient(ellipse 40% 50% at 10% 80%, rgba(249,115,22,.07) 0%, transparent 60%)',
        }}
      />
      {/* Decorative grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 mx-auto grid max-w-[1160px] grid-cols-1 items-center gap-10 px-4 sm:px-6 md:grid-cols-2 md:gap-12 lg:gap-16">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5">
            <span className="relative inline-block h-[7px] w-[7px] rounded-full bg-[#F97316] shadow-[0_0_0_3px_rgba(249,115,22,0.25)]" />
            <span className="font-['Inter',sans-serif] text-[12px] font-semibold tracking-wide text-white/80">
              Built for Contractors, by Contractors
            </span>
          </div>
          <h1 className="font-['Inter',sans-serif] text-[clamp(34px,6vw,60px)] font-black leading-[1.08] tracking-tight text-white">
            Run Your Business
            <br />
            <span className="text-[#F97316]">on Autopilot.</span>
          </h1>
          <p className="mt-5 max-w-[440px] text-base leading-relaxed text-white/65 sm:text-[18px]">
            Ezly connects the key aspects of your business — scheduling,
            invoicing, CRM, and more — so nothing falls through the cracks.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Link
              href="/signup"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#0F3A7D] px-6 py-3.5 font-['Inter',sans-serif] text-base font-bold text-white shadow-[0_4px_16px_rgba(15,58,125,0.3)] ring-1 ring-white/20 transition-all hover:-translate-y-px hover:bg-[#082860] hover:shadow-[0_8px_24px_rgba(15,58,125,0.35)]"
            >
              Start Free Trial <span aria-hidden="true">→</span>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-white/35 bg-transparent px-6 py-3.5 font-['Inter',sans-serif] text-base font-bold text-white transition-colors hover:border-white/60 hover:bg-white/10"
            >
              See How It Works
            </a>
          </div>

          <p className="mt-8 text-[13px] tracking-wide text-white/80">
            <strong>14-day free trial &nbsp;·&nbsp; Cancel anytime</strong>
          </p>
          <Link
            href="/login"
            className="mt-3 inline-flex items-center gap-1.5 border-b border-white/25 pb-[1px] font-['Inter',sans-serif] text-[13px] font-semibold text-white/65 transition-colors hover:border-white/60 hover:text-white"
          >
            Already have an account? &nbsp;
            <strong className="text-white">Sign In →</strong>
          </Link>
        </div>

        {/* Dashboard mockup — hidden on small screens, visible from md+ */}
        <div className="relative hidden md:block">
          {/* Floating card top */}
          <div className="absolute -top-2 right-2 z-10 hidden rounded-2xl border border-white/50 bg-white px-3.5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.18)] xl:block">
            <div className="text-[10px] text-gray-400">Invoice sent</div>
            <div className="font-['Inter',sans-serif] text-sm font-extrabold text-[#F97316]">
              $3,800 ✓
            </div>
          </div>

          {/* Floating card bottom */}
          <div className="absolute -bottom-2 -left-3 z-10 hidden items-center gap-2.5 rounded-2xl border border-white/50 bg-white px-3.5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.18)] xl:flex">
            <div className="text-xl" aria-hidden="true">
              🎉
            </div>
            <div>
              <div className="text-[10px] text-gray-400">New lead received</div>
              <div className="font-['Inter',sans-serif] text-sm font-extrabold text-[#0F3A7D]">
                $4,200 Roofing Job
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_32px_80px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-1.5 bg-[#0F3A7D] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            </div>
            <div className="bg-gray-50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="font-['Inter',sans-serif] text-sm font-bold text-[#0F3A7D]">
                  Good morning, Mike 👋
                </div>
                <div className="text-[11px] text-gray-400">Apr 23, 2026</div>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Revenue', val: '$18.4k', cls: 'text-[#0F3A7D]', delta: '↑ 12% this month' },
                  { label: 'Active Jobs', val: '9', cls: 'text-[#F97316]', delta: '↑ 3 new' },
                  { label: 'Leads', val: '24', cls: 'text-[#F97316]', delta: '↑ 8 today' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                      {s.label}
                    </div>
                    <div className={`font-['Inter',sans-serif] text-lg font-extrabold ${s.cls}`}>
                      {s.val}
                    </div>
                    <div className="mt-0.5 text-[9px] font-semibold text-emerald-500">{s.delta}</div>
                  </div>
                ))}
              </div>

              <div className="mb-2 font-['Inter',sans-serif] text-[11px] font-bold uppercase tracking-wider text-gray-700">
                Active Jobs
              </div>
              <div className="mb-4 flex flex-col gap-1.5">
                {[
                  { icon: '🔧', bg: 'rgba(20,184,166,0.1)', name: 'Johnson Kitchen Reno', desc: 'Due May 2 · $6,400', badge: 'Active', bcls: 'bg-[#F97316]/15 text-[#F97316]' },
                  { icon: '🏠', bg: 'rgba(249,115,22,0.1)', name: 'Smith Roof Repair', desc: 'Due Apr 28 · $2,100', badge: 'Pending', bcls: 'bg-amber-500/15 text-amber-700' },
                  { icon: '⚡', bg: 'rgba(16,185,129,0.1)', name: 'Garcia Electrical', desc: 'Completed · $3,800', badge: 'Done', bcls: 'bg-emerald-500/15 text-emerald-700' },
                ].map(j => (
                  <div key={j.name} className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[13px]" style={{ background: j.bg }}>
                      {j.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-bold text-gray-900">{j.name}</div>
                      <div className="mt-px truncate text-[10px] text-gray-400">{j.desc}</div>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${j.bcls}`}>
                      {j.badge}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mb-2 font-['Inter',sans-serif] text-[11px] font-bold uppercase tracking-wider text-gray-700">
                Revenue by Service
              </div>
              {[
                { label: 'Roofing', width: '78%', color: '#0F3A7D' },
                { label: 'Plumbing', width: '55%', color: '#F97316' },
                { label: 'Electrical', width: '40%', color: '#F97316' },
              ].map(r => (
                <div key={r.label} className="mb-2 flex items-center gap-2">
                  <span className="w-14 flex-shrink-0 text-[9px] text-gray-400">{r.label}</span>
                  <div className="h-1.5 flex-1 rounded bg-gray-200">
                    <div className="h-full rounded" style={{ width: r.width, background: r.color }} />
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
