/**
 * Dark features section with glass cards and Algolia-blue accents.
 * Highlight card (Contractor Websites) spans the full width on mobile and
 * 2 columns on >=sm. Seven regular glass cards fill out a clean 3x3 grid
 * on lg (9 slots = 2 from highlight + 7 cards).
 */
export function Features() {
  const cards = [
    {
      icon: '🔧',
      title: 'Job Management',
      desc: 'Track every job from lead to completion. Photos, notes, line items, and status all in one place.',
    },
    {
      icon: '👥',
      title: 'Customer CRM',
      desc: 'Pipeline, deals, activity timeline, and follow-ups. Built-in analytics so you see what is actually closing.',
    },
    {
      icon: '🗓️',
      title: 'Dispatch & Scheduling',
      desc: 'Day, week, and month views with technician availability. Drag-and-drop assignments and route-aware planning.',
    },
    {
      icon: '⚙️',
      title: 'Automations',
      desc: 'Trigger-based SMS and email — appointment reminders, status updates, payment nudges — that run themselves.',
    },
    {
      icon: '🧾',
      title: 'Invoicing & Payments',
      desc: 'Generate professional invoices in seconds. Send a secure link and get paid online without phone tag.',
    },
    {
      icon: '💬',
      title: 'Client Portal & Chat',
      desc: 'Customers see jobs, invoices, and contracts in their own portal — and chat with you without downloading an app.',
    },
    {
      icon: '📄',
      title: 'Contracts & Change Orders',
      desc: 'Templates, versions, and e-signatures. Push scope or price changes through a clean change-order workflow.',
    },
  ]

  return (
    <section
      id="features"
      className="relative scroll-mt-24 overflow-hidden bg-[#0B0B1F] py-20 sm:py-24 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(84,104,255,0.15) 0%, transparent 60%), radial-gradient(40% 40% at 100% 100%, rgba(249,115,22,0.12) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="mb-14 text-center sm:mb-16">
          <span className="inline-block rounded-full border border-[#5468FF]/30 bg-[#5468FF]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7B8AFF]">
            Features
          </span>
          <h2 className="mx-auto mt-4 max-w-[760px] text-[clamp(28px,4.8vw,46px)] font-extrabold leading-[1.1] tracking-[-0.02em] text-white">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-[#5468FF] via-[#7B8AFF] to-[#F97316] bg-clip-text text-transparent">
              grow
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[17px] leading-relaxed text-white/60">
            One platform. Every tool. Built specifically for contractors who
            want to scale.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Highlight card */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-[#5468FF]/20 via-[#11122B] to-[#0B0B1F] p-8 transition-all hover:-translate-y-1 hover:border-[#5468FF]/50 hover:shadow-[0_20px_60px_-12px_rgba(84,104,255,0.6)] sm:col-span-2 lg:flex lg:items-center lg:gap-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full opacity-60 blur-3xl transition-opacity group-hover:opacity-90"
              style={{ background: 'radial-gradient(circle, rgba(84,104,255,0.6) 0%, transparent 70%)' }}
            />
            <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] text-[26px] backdrop-blur-md lg:mb-0 lg:h-16 lg:w-16 lg:text-[28px]">
              🌐
            </div>
            <div className="relative">
              <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Your own contractor website — generated for you
              </h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-white/65">
                Spin up a branded public site with your services, photos, and
                service area in minutes. Visitors request quotes and those
                leads land straight in your dashboard, 24/7.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#F97316]/30 bg-[#F97316]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#F97316]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F97316] shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                New — Lead Capture Built In
              </span>
            </div>
          </div>

          {cards.map(c => (
            <div
              key={c.title}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-[#5468FF]/40 hover:bg-white/[0.06] sm:p-8"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#5468FF]/20 to-transparent text-[22px]">
                {c.icon}
              </div>
              <h3 className="text-base font-bold tracking-tight text-white">
                {c.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-white/55">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
