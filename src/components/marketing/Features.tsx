/**
 * Features grid. Highlight card (Business Analytics) spans the full width
 * on mobile and 2 columns on >=md. Other cards: 1 col on mobile, 2 on sm,
 * 3 on lg.
 */
export function Features() {
  const cards = [
    {
      icon: '🔧',
      title: 'Job Management',
      desc: 'Track every job from lead to completion. Schedule, assign, and monitor progress in real-time.',
    },
    {
      icon: '👥',
      title: 'Customer CRM',
      desc: 'Never lose a customer again. Built-in follow-ups, notes, and history for every client.',
    },
    {
      icon: '🧾',
      title: 'Invoicing & Payments',
      desc: 'Generate professional invoices in seconds. Accept payments online with zero hassle.',
    },
    {
      icon: '⚡',
      title: 'Lead Pipeline',
      desc: 'New customer leads flow into your dashboard automatically. Never miss an opportunity.',
    },
    {
      icon: '🚀',
      title: 'Easy Setup',
      desc: 'Get started in minutes. Import your existing customers and jobs with one click.',
    },
  ]

  return (
    <section id="features" className="scroll-mt-24 bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        <div className="mb-12 text-center sm:mb-14">
          <span className="font-['Inter',sans-serif] text-[11px] font-bold uppercase tracking-[0.12em] text-[#F97316]">
            Features
          </span>
          <h2 className="mx-auto mt-2.5 font-['Inter',sans-serif] text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.15] tracking-tight text-[#0F3A7D]">
            Everything you need to grow
          </h2>
          <p className="mx-auto mt-3.5 max-w-[520px] text-base leading-relaxed text-gray-500 sm:text-[17px]">
            One platform. Every tool. Built specifically for contractors who
            want to scale.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Highlight card */}
          <div className="rounded-2xl border border-[#0F3A7D] bg-[#0F3A7D] p-7 transition-all hover:-translate-y-1 hover:border-[#F97316] hover:shadow-[0_8px_40px_rgba(15,58,125,0.35)] sm:col-span-2 sm:p-8 lg:flex lg:items-center lg:gap-10">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-[26px] lg:mb-0 lg:h-16 lg:w-16 lg:text-[28px]">
              📊
            </div>
            <div>
              <h3 className="font-['Inter',sans-serif] text-lg font-bold text-white sm:text-xl">
                Business Analytics that actually make sense
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/65">
                Track revenue, jobs, and customer trends in real time. See
                exactly what&apos;s driving growth — and what&apos;s not. Make
                smarter decisions without the spreadsheets.
              </p>
              <span className="mt-4 inline-block rounded-full bg-[#F97316]/20 px-3 py-1 font-['Inter',sans-serif] text-[11px] font-bold uppercase tracking-wider text-[#F97316]">
                NEW — Real-time Insights
              </span>
            </div>
          </div>

          {cards.map(c => (
            <div
              key={c.title}
              className="rounded-2xl border border-gray-200 bg-white p-7 transition-all hover:-translate-y-1 hover:border-[#F97316] hover:shadow-[0_8px_32px_rgba(20,184,166,0.1)] sm:p-8"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0F3A7D]/5 text-[22px]">
                {c.icon}
              </div>
              <h3 className="font-['Inter',sans-serif] text-base font-bold text-gray-900">
                {c.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
