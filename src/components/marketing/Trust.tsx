/**
 * 3-up trust strip — light, narrow, with Algolia-blue icon chips.
 */
export function Trust() {
  const items = [
    { icon: '👥', title: 'Unlimited Team Seats', desc: 'Bring your whole crew on the same flat plan.' },
    { icon: '⚡', title: '99.9% Uptime', desc: 'Your business never stops, and neither do we.' },
    { icon: '🤝', title: '24/7 Real Support', desc: 'Real humans, real help — not bots.' },
  ]

  return (
    <section className="border-y border-gray-200/70 bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="mx-auto grid max-w-[860px] grid-cols-1 gap-10 text-center sm:grid-cols-3 sm:gap-8">
          {items.map(i => (
            <div key={i.title} className="flex flex-col items-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[#5468FF]/15 bg-gradient-to-br from-[#5468FF]/10 to-[#F97316]/10 text-2xl">
                {i.icon}
              </div>
              <div className="text-[15px] font-bold tracking-tight text-[#0B0B1F]">
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
