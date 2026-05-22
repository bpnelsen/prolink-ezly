/* eslint-disable @next/next/no-img-element */

/**
 * 3-card testimonials grid. 1-col on mobile, 2-col on sm, 3-col on lg.
 * Middle card has a subtle teal/orange highlight ring (matches the
 * original .testi-card.featured style).
 */
export function Testimonials() {
  const cards = [
    {
      quote:
        "EZLY cut my admin time in half. I used to spend Sunday nights doing invoices — now it takes 10 minutes.",
      photo:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face&q=80',
      name: 'Mike R.',
      role: 'General Contractor',
      featured: false,
    },
    {
      quote:
        'The lead pipeline is a game changer. I follow up same day and close more jobs than I ever have before.',
      photo:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face&q=80',
      name: 'Sarah K.',
      role: 'Plumbing Company Owner',
      featured: true,
    },
    {
      quote:
        'Finally, one tool that does everything. No more juggling QuickBooks, spreadsheets, and sticky notes.',
      photo:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face&q=80',
      name: 'David L.',
      role: 'Roofing Contractor',
      featured: false,
    },
  ]

  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        <div className="mb-12 text-center sm:mb-14">
          <span className="font-['Inter',sans-serif] text-[11px] font-bold uppercase tracking-[0.12em] text-[#F97316]">
            Testimonials
          </span>
          <h2 className="mx-auto mt-2.5 font-['Inter',sans-serif] text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.15] tracking-tight text-[#0F3A7D]">
            What contractors are saying
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(c => (
            <div
              key={c.name}
              className={`flex flex-col rounded-2xl border bg-white p-7 sm:p-8 ${
                c.featured
                  ? 'border-[#F97316] shadow-[0_4px_24px_rgba(249,115,22,0.12)]'
                  : 'border-gray-200'
              }`}
            >
              <div className="mb-4 flex gap-0.5 text-[15px]" aria-hidden="true">
                ⭐⭐⭐⭐⭐
              </div>
              <span
                className="block font-['Inter',sans-serif] text-[44px] font-black leading-none text-[#F97316]/25"
                aria-hidden="true"
              >
                &ldquo;
              </span>
              <p className="mb-6 mt-2 flex-1 text-[15px] leading-relaxed text-gray-700">
                {c.quote}
              </p>
              <div className="flex items-center gap-3">
                <img
                  src={c.photo}
                  alt={c.name}
                  loading="lazy"
                  className="h-11 w-11 flex-shrink-0 rounded-xl border-2 border-gray-100 object-cover"
                />
                <div>
                  <div className="font-['Inter',sans-serif] text-sm font-bold text-[#0F3A7D]">
                    {c.name}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">{c.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
