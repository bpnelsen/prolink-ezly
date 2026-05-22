/**
 * 3-step "How It Works" section. Stacks vertically on mobile,
 * 3-up on >=md.
 */
export function HowItWorks() {
  const steps = [
    {
      n: '01',
      bg: 'bg-[#0F3A7D]',
      title: 'Create your account',
      desc:
        'Sign up in 30 seconds. No credit card required to start your free 14-day trial.',
    },
    {
      n: '02',
      bg: 'bg-[#F97316]',
      title: 'Import your data',
      desc:
        'Bring your existing customers and jobs in minutes. We help you get set up fast.',
    },
    {
      n: '03',
      bg: 'bg-[#F97316]',
      title: 'Watch your business grow',
      desc:
        'Close more jobs. Get more leads. Spend less time on paperwork. Simple as that.',
    },
  ]

  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 bg-gray-50 py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        <div className="mb-12 text-center sm:mb-14">
          <span className="font-['Inter',sans-serif] text-[11px] font-bold uppercase tracking-[0.12em] text-[#F97316]">
            How It Works
          </span>
          <h2 className="mx-auto mt-2.5 font-['Inter',sans-serif] text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.15] tracking-tight text-[#0F3A7D]">
            Up and running in 3 steps
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8 lg:gap-12">
          {steps.map(s => (
            <div key={s.n} className="text-center">
              <div
                className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${s.bg} font-['Inter',sans-serif] text-2xl font-black text-white shadow-[0_8px_24px_rgba(15,58,125,0.3)] sm:h-[72px] sm:w-[72px] sm:text-[28px]`}
              >
                {s.n}
              </div>
              <h3 className="font-['Inter',sans-serif] text-lg font-bold text-[#0F3A7D]">
                {s.title}
              </h3>
              <p className="mx-auto mt-2.5 max-w-xs text-sm leading-relaxed text-gray-500">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
