/* eslint-disable @next/next/no-img-element */

/**
 * 3-card testimonials grid on a light background. Middle card gets the
 * Algolia-blue gradient ring + glow.
 */
export function Testimonials() {
  const cards = [
    {
      quote:
        "Ezly cut my admin time in half. I used to spend Sunday nights doing invoices — now it takes 10 minutes.",
      photo:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face&q=80',
      name: 'Mike R.',
      role: 'General Contractor',
      featured: false,
    },
    {
      quote:
        'Quote requests from my Ezly website land in the dashboard while I am on the truck. I close more jobs because I follow up the same day.',
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
    <section className="relative overflow-hidden bg-white py-20 sm:py-24 lg:py-28">
      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="mb-14 text-center sm:mb-16">
          <span className="inline-block rounded-full border border-[#5468FF]/20 bg-[#5468FF]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5468FF]">
            Testimonials
          </span>
          <h2 className="mx-auto mt-4 max-w-[640px] text-[clamp(28px,4.8vw,46px)] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#0B0B1F]">
            What contractors are saying
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(c => (
            <div
              key={c.name}
              className={`relative flex flex-col rounded-3xl p-8 transition-all ${
                c.featured
                  ? 'border border-transparent bg-gradient-to-br from-[#5468FF]/[0.06] via-white to-[#F97316]/[0.04] shadow-[0_20px_50px_-12px_rgba(84,104,255,0.3)] ring-1 ring-[#5468FF]/25'
                  : 'border border-gray-200 bg-white shadow-[0_4px_24px_-6px_rgba(15,23,42,0.06)]'
              }`}
            >
              <div className="mb-4 flex gap-0.5 text-[15px]" aria-hidden="true">
                ⭐⭐⭐⭐⭐
              </div>
              <span
                className="block bg-gradient-to-br from-[#5468FF] to-[#F97316] bg-clip-text text-[52px] font-black leading-none text-transparent opacity-30"
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
                  className="h-11 w-11 flex-shrink-0 rounded-xl border-2 border-white object-cover shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
                />
                <div>
                  <div className="text-sm font-bold text-[#0B0B1F]">
                    {c.name}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">{c.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
