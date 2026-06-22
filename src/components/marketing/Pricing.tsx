import Link from 'next/link'

/**
 * Single-plan Ezly pricing card. Dark section with a dramatic glass card,
 * gradient ring, and animated glow. Centered, max-width-constrained so it
 * stays readable from 320px up.
 */
export function Pricing() {
  const features = [
    'Everything included — no feature tiers',
    'Unlimited team seats — invite your whole crew',
    'CRM, dispatch & scheduling, invoicing',
    'Contracts, e-signatures & change orders',
    'Client portal, chat & SMS/email automations',
    'Branded contractor website with lead capture',
    'Unlimited customers, jobs & invoices',
    '14-day free trial · cancel anytime',
  ]

  return (
    <section
      id="pricing"
      className="relative scroll-mt-24 overflow-hidden bg-[#0B0B1F] py-20 sm:py-24 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 50%, rgba(84,104,255,0.18) 0%, transparent 60%), radial-gradient(40% 30% at 50% 0%, rgba(249,115,22,0.10) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.2]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="mb-14 text-center sm:mb-16">
          <span className="inline-block rounded-full border border-[#5468FF]/30 bg-[#5468FF]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7B8AFF]">
            Pricing
          </span>
          <h2 className="mx-auto mt-4 max-w-[680px] text-[clamp(28px,4.8vw,46px)] font-extrabold leading-[1.1] tracking-[-0.02em] text-white">
            Simple, transparent{' '}
            <span className="bg-gradient-to-r from-[#5468FF] to-[#F97316] bg-clip-text text-transparent">
              pricing
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-[540px] text-[17px] leading-relaxed text-white/60">
            One flat plan with unlimited seats. Free for 14 days. Bring your whole team for the same price.
          </p>
        </div>

        <div className="relative mx-auto max-w-[480px]">
          {/* Gradient ring frame */}
          <div
            aria-hidden="true"
            className="absolute -inset-px rounded-[28px] bg-gradient-to-br from-[#5468FF] via-[#0F3A7D] to-[#F97316] opacity-80 blur-[1px]"
          />
          {/* Outer glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-8 rounded-[28px] opacity-50 blur-3xl"
            style={{
              background:
                'radial-gradient(50% 50% at 50% 50%, rgba(84,104,255,0.5) 0%, transparent 70%)',
            }}
          />

          {/* Floating badge — sits on the outer wrapper so the inner card's
              overflow-hidden doesn't clip it. */}
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#F97316] to-[#5468FF] px-4 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_4px_12px_rgba(84,104,255,0.5)]">
            One simple plan
          </div>

          <div className="relative overflow-hidden rounded-[26px] bg-[#11122B] px-8 pt-12 pb-10 sm:px-10 sm:pt-14 sm:pb-12">
            <p className="text-center text-[15px] font-semibold text-white/75">
              Everything included. No tiers, no surprises.
            </p>

            <div className="mt-8 flex items-baseline justify-center gap-1.5">
              <span className="bg-gradient-to-br from-white to-[#7B8AFF] bg-clip-text text-[52px] font-black leading-none text-transparent">
                $49
              </span>
              <span className="text-base font-medium text-white/40">/mo</span>
            </div>
            <p className="mt-2 text-center text-xs text-white/45">
              Unlimited team seats · 14-day free trial
            </p>

            <ul className="mt-8 flex flex-col gap-3.5">
              {features.map(f => (
                <li
                  key={f}
                  className="flex items-start gap-3 text-[13.5px] text-white/85"
                >
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5468FF] to-[#0F3A7D] text-[10px] font-bold text-white" aria-hidden="true">
                    ✓
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="mt-8 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F97316] to-[#FB8E3B] px-4 py-3.5 text-sm font-bold text-white shadow-[0_8px_28px_-4px_rgba(249,115,22,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-4px_rgba(249,115,22,0.7)]"
            >
              Start free trial <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
