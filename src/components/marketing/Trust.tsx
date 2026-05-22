/**
 * 3-up trust strip. Stacks on mobile, 3-col on >=md.
 */
export function Trust() {
  const items = [
    { icon: '🔒', title: 'Bank-Level Security', desc: '256-bit SSL encryption on all data, every time.' },
    { icon: '⚡', title: '99.9% Uptime', desc: 'Your business never stops, and neither do we.' },
    { icon: '🤝', title: '24/7 Real Support', desc: 'Real humans, real help — not bots.' },
  ]

  return (
    <section className="border-y border-gray-200 bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        <div className="mx-auto grid max-w-[800px] grid-cols-1 gap-8 text-center sm:grid-cols-3 sm:gap-6">
          {items.map(i => (
            <div key={i.title}>
              <div className="mb-3 text-3xl" aria-hidden="true">
                {i.icon}
              </div>
              <div className="font-['Inter',sans-serif] text-[15px] font-bold text-[#0F3A7D]">
                {i.title}
              </div>
              <p className="mx-auto mt-1.5 max-w-[260px] text-[13px] leading-relaxed text-gray-500">
                {i.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
