/**
 * Two-card "before/after" Problem vs Solution comparison.
 * Cards stack on mobile, side-by-side on >=md. Bullet rows wrap freely.
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
    'New leads auto-populate into your pipeline instantly',
    'Generate professional invoices in seconds, not hours',
    'Real-time analytics on your most profitable work',
  ]

  return (
    <section className="bg-gray-50 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        <div className="mb-12 text-center sm:mb-14">
          <span className="font-['Inter',sans-serif] text-[11px] font-bold uppercase tracking-[0.12em] text-[#F97316]">
            Sound familiar?
          </span>
          <h2 className="mx-auto mt-2.5 font-['Inter',sans-serif] text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.15] tracking-tight text-[#0F3A7D]">
            Most contractors waste
            <br className="hidden sm:block" /> 10+ hours a week on admin.
          </h2>
          <p className="mx-auto mt-3.5 max-w-[520px] text-base leading-relaxed text-gray-500 sm:text-[17px]">
            We built EZLY to fix that. Here&apos;s what changes when you make
            the switch.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-7 sm:p-10">
            <div className="mb-6 flex items-center gap-2 font-['Inter',sans-serif] text-[11px] font-bold uppercase tracking-[0.1em] text-red-500">
              <span className="h-0.5 w-6 bg-red-500" />
              The Problem
            </div>
            <ul className="flex flex-col gap-4">
              {problems.map(p => (
                <li key={p} className="flex items-start gap-3 text-[15px] leading-snug text-gray-700">
                  <span className="mt-0.5 flex-shrink-0 text-red-500" aria-hidden="true">
                    ✕
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#0F3A7D] bg-[#0F3A7D] p-7 sm:p-10">
            <div className="mb-6 flex items-center gap-2 font-['Inter',sans-serif] text-[11px] font-bold uppercase tracking-[0.1em] text-[#F97316]">
              <span className="h-0.5 w-6 bg-[#F97316]" />
              The EZLY Way
            </div>
            <ul className="flex flex-col gap-4">
              {solutions.map(s => (
                <li key={s} className="flex items-start gap-3 text-[15px] leading-snug text-white/90">
                  <span className="mt-0.5 flex-shrink-0 text-[#F97316]" aria-hidden="true">
                    ✓
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
