/* eslint-disable @next/next/no-img-element */

/**
 * Photo band with copy + 3-tile image grid. Stacks on mobile (text above
 * a 2-up image grid), 3-column on >=lg with the tall tile on the left
 * and two stacked tiles on the right.
 */
export function PhotoBand() {
  return (
    <section className="overflow-hidden bg-[#0F3A7D] py-16 sm:py-20">
      <div className="mx-auto grid max-w-[1160px] grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-3 lg:items-stretch">
        <div className="flex flex-col justify-center lg:pr-8">
          <span className="mb-3 block font-['Inter',sans-serif] text-[11px] font-bold uppercase tracking-[0.12em] text-[#F97316]">
            Real contractors. Real results.
          </span>
          <h2 className="font-['Inter',sans-serif] text-[clamp(24px,4vw,38px)] font-black leading-[1.15] tracking-tight text-white">
            Built for the job site, not the office.
          </h2>
          <p className="mt-4 max-w-[460px] text-[15px] leading-relaxed text-white/60">
            From roofing to remodeling, EZLY fits the way you already work —
            keeping you connected whether you&apos;re on-site or on the road.
          </p>
          <a
            href="#how-it-works"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 self-start rounded-xl bg-[#F97316] px-5 py-3 font-['Inter',sans-serif] text-sm font-bold text-white shadow-[0_2px_8px_rgba(249,115,22,0.3)] transition-all hover:-translate-y-px hover:bg-[#e05f0a]"
          >
            See How It Works →
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <div className="relative col-span-2 row-span-1 overflow-hidden rounded-2xl sm:col-span-1 sm:row-span-2">
            <img
              src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=800&fit=crop&q=80"
              alt="Contractor on roof"
              loading="lazy"
              className="h-56 w-full object-cover transition-transform duration-500 hover:scale-105 sm:h-full"
            />
          </div>
          <div className="relative overflow-hidden rounded-2xl">
            <img
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=380&fit=crop&q=80"
              alt="Kitchen renovation"
              loading="lazy"
              className="h-40 w-full object-cover transition-transform duration-500 hover:scale-105 sm:h-full"
            />
          </div>
          <div className="relative overflow-hidden rounded-2xl">
            <img
              src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=380&fit=crop&q=80"
              alt="Home improvement"
              loading="lazy"
              className="h-40 w-full object-cover transition-transform duration-500 hover:scale-105 sm:h-full"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
