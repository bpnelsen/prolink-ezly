/**
 * "Trusted by contractors across the country" social-proof strip.
 * 4-column grid on >=md, 2-column on mobile. Vertical dividers between
 * items collapse off on mobile so stats never crowd each other.
 */
export function ProofBar() {
  const items = [
    { num: '500+', label: 'Contractors' },
    { num: '12K+', label: 'Jobs Managed' },
    { num: '$2.4M+', label: 'Invoiced' },
    { num: '4.9★', label: 'Avg Rating' },
  ]

  return (
    <section className="border-b border-gray-200 bg-white py-9">
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        <p className="mb-6 text-center text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
          Trusted by contractors across the country
        </p>
        <div className="mx-auto grid max-w-[720px] grid-cols-2 gap-y-6 md:grid-cols-4 md:gap-y-0">
          {items.map((it, i) => (
            <div
              key={it.label}
              className={`px-3 text-center md:px-4 ${
                i > 0 ? 'md:border-l md:border-gray-200' : ''
              }`}
            >
              <div className="mb-1 font-['Inter',sans-serif] text-[28px] font-black leading-none text-[#0F3A7D] sm:text-[32px] md:text-[36px]">
                {it.num}
              </div>
              <div className="text-xs text-gray-500 sm:text-[13px]">{it.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
