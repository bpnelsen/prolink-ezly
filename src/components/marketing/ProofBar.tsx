/**
 * "Trusted by contractors across the country" social-proof strip. Sits
 * in the dark section after the hero — gradient numbers, subtle dividers.
 */
export function ProofBar() {
  const items = [
    { num: '500+', label: 'Contractors' },
    { num: '12K+', label: 'Jobs Managed' },
    { num: '$2.4M+', label: 'Invoiced' },
    { num: '4.9★', label: 'Avg Rating' },
  ]

  return (
    <section className="border-t border-white/5 bg-[#0B0B1F] py-10 sm:py-12">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <p className="mb-7 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
          Trusted by contractors across the country
        </p>
        <div className="mx-auto grid max-w-[820px] grid-cols-2 gap-y-7 md:grid-cols-4 md:gap-y-0">
          {items.map((it, i) => (
            <div
              key={it.label}
              className={`px-3 text-center md:px-4 ${
                i > 0 ? 'md:border-l md:border-white/10' : ''
              }`}
            >
              <div className="mb-1 bg-gradient-to-br from-white to-[#7B8AFF] bg-clip-text text-[30px] font-black leading-none text-transparent sm:text-[34px] md:text-[38px]">
                {it.num}
              </div>
              <div className="text-xs text-white/55 sm:text-[13px]">{it.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
