/**
 * Two-card "before/after" comparison. Light section so the colored cards
 * pop — left card is a clean white "problem" card, right card is the dark
 * gradient "EZLY way" card with a Algolia-blue glow.
 */
export function ProblemSolution() {
  const problems = [
    'Juggling multiple apps for CRM, invoicing, and scheduling',
    "Lost leads because you couldn't follow up fast enough",
    'Invoicing takes hours you could spend on actual jobs',
    'Zero visibility into which jobs are actually profitable',
  ]
  const solutions = [
    'Everything in one dashboard — CRM, jobs, invoicing',
    'Quote requests from your contractor website land in your pipeline automatically',
    'Generate professional invoices in seconds, not hours',
    'Real-time analytics on your most profitable work',
  ]

  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-24 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            'radial-gradient(50% 40% at 80% 30%, rgba(84,104,255,0.08) 0%, transparent 70%), radial-gradient(40% 40% at 10% 70%, rgba(249,115,22,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="mb-14 text-center sm:mb-16">
          <span className="inline-block rounded-full border border-[#5468FF]/20 bg-[#5468FF]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5468FF]">
            Sound familiar?
          </span>
          <h2 className="mx-auto mt-4 max-w-[820px] text-[clamp(28px,4.8vw,46px)] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#0B0B1F]">
            Most contractors waste <span className="bg-gradient-to-r from-[#5468FF] to-[#F97316] bg-clip-text text-transparent">10+ hours</span> a week on admin.
          </h2>
          <p className="mx-auto mt-4 max-w-[540px] text-[17px] leading-relaxed text-gray-500">
            We built Ezly to fix that. Here&apos;s what changes when you make
            the switch.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] sm:p-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-red-600">
              Without Ezly
            </div>
            <ul className="flex flex-col gap-4">
              {problems.map(p => (
                <li key={p} className="flex items-start gap-3 text-[15px] leading-snug text-gray-700">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold text-red-600" aria-hidden="true">
                    ✕
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0F3A7D] via-[#11122B] to-[#0B0B1F] p-8 shadow-[0_20px_60px_-12px_rgba(84,104,255,0.45)] sm:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-50 blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(84,104,255,0.6) 0%, transparent 70%)' }}
            />
            <div className="relative">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#5468FF]/30 bg-[#5468FF]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#7B8AFF]">
                The Ezly way
              </div>
              <ul className="flex flex-col gap-4">
                {solutions.map(s => (
                  <li key={s} className="flex items-start gap-3 text-[15px] leading-snug text-white/85">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5468FF] to-[#0F3A7D] text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(84,104,255,0.5)]" aria-hidden="true">
                      ✓
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
