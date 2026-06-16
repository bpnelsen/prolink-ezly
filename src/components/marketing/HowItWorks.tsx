/**
 * 3-step "How It Works" — light section, numbered glass badges with
 * gradient borders and a connecting hairline rail on desktop.
 */
export function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Set up your account',
      desc:
        'Sign up in 30 seconds, add your team, and dial in your branding and invoicing. No credit card required for the 14-day trial.',
    },
    {
      n: '02',
      title: 'Run your day from one dashboard',
      desc:
        'Schedule and dispatch jobs, message customers in their portal, send contracts, and collect payment online — without juggling tabs.',
    },
    {
      n: '03',
      title: 'Let automations bring in the rest',
      desc:
        'SMS reminders and status updates run themselves, and your contractor website captures new leads straight into your pipeline.',
    },
  ]

  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-24 overflow-hidden bg-white py-20 sm:py-24 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(40% 30% at 50% 0%, rgba(84,104,255,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="mb-16 text-center">
          <span className="inline-block rounded-full border border-[#5468FF]/20 bg-[#5468FF]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5468FF]">
            How It Works
          </span>
          <h2 className="mx-auto mt-4 max-w-[680px] text-[clamp(28px,4.8vw,46px)] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#0B0B1F]">
            Up and running in{' '}
            <span className="bg-gradient-to-r from-[#5468FF] to-[#F97316] bg-clip-text text-transparent">
              3 steps
            </span>
          </h2>
        </div>

        <div className="relative">
          {/* Connecting rail (desktop only) */}
          <div
            aria-hidden="true"
            className="absolute left-[16%] right-[16%] top-9 hidden h-px bg-gradient-to-r from-transparent via-[#5468FF]/40 to-transparent md:block"
          />

          <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8 lg:gap-12">
            {steps.map(s => (
              <div key={s.n} className="text-center">
                <div className="relative mx-auto mb-6 h-[72px] w-[72px]">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#5468FF] to-[#0F3A7D] opacity-30 blur-xl"
                  />
                  <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-white bg-gradient-to-br from-[#5468FF] to-[#0F3A7D] text-[28px] font-black text-white shadow-[0_12px_30px_-6px_rgba(84,104,255,0.6)]">
                    {s.n}
                  </div>
                </div>
                <h3 className="text-lg font-bold tracking-tight text-[#0B0B1F]">
                  {s.title}
                </h3>
                <p className="mx-auto mt-3 max-w-xs text-[14px] leading-relaxed text-gray-500">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
