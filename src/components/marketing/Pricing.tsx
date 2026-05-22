import Link from 'next/link'

/**
 * Single-plan Prolink pricing card. Centered, max-width-constrained
 * so the card stays readable from 320px up. CTA is the "Start free trial"
 * variant (default).
 */
export function Pricing() {
  const features = [
    'Everything included — no feature tiers',
    'Unlimited customers, jobs & invoices',
    'Customer portal, chat & AI deal plans',
    '$49/mo includes you — extra seats $15/mo each',
    '14-day free trial · cancel anytime',
  ]

  return (
    <section
      id="pricing"
      className="scroll-mt-24 bg-gray-50 py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        <div className="mb-12 text-center sm:mb-14">
          <span className="font-['Inter',sans-serif] text-[11px] font-bold uppercase tracking-[0.12em] text-[#F97316]">
            Pricing
          </span>
          <h2 className="mx-auto mt-2.5 font-['Inter',sans-serif] text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.15] tracking-tight text-[#0F3A7D]">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-3.5 max-w-[520px] text-base leading-relaxed text-gray-500 sm:text-[17px]">
            One flat plan. Free for 14 days. Add seats as your team grows.
          </p>
        </div>

        <div className="mx-auto max-w-[460px]">
          <div className="relative rounded-3xl border border-[#0F3A7D] bg-[#0F3A7D] p-7 shadow-[0_20px_60px_rgba(15,58,125,0.25)] sm:p-9">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[#F97316] px-4 py-1 font-['Inter',sans-serif] text-[10px] font-extrabold uppercase tracking-[0.1em] text-white">
              One simple plan
            </div>

            <h3 className="font-['Inter',sans-serif] text-base font-bold text-white">
              Prolink
            </h3>
            <p className="mt-1 text-[13px] text-white/55">
              Everything included. No tiers, no surprises.
            </p>

            <div className="mt-6 font-['Inter',sans-serif] text-[44px] font-black leading-none text-white">
              $49
              <span className="text-base font-medium text-white/40">/mo</span>
            </div>
            <p className="mt-1 text-xs text-white/40">
              + $15/mo per additional user · 14-day free trial
            </p>

            <ul className="mt-7 flex flex-col gap-3">
              {features.map(f => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-[13px] text-white/85"
                >
                  <span className="mt-0.5 flex-shrink-0 text-[#F97316]" aria-hidden="true">
                    ✦
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="mt-7 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#F97316] px-4 py-3.5 font-['Inter',sans-serif] text-sm font-bold text-white transition-all hover:-translate-y-px hover:bg-[#e05f0a]"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
