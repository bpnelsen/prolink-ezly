/* eslint-disable @next/next/no-img-element */

/**
 * Photo band — dark with text + 3-tile image grid framed by glass borders
 * and an Algolia-blue glow.
 */
export function PhotoBand() {
  return (
    <section className="relative overflow-hidden bg-[#0B0B1F] py-20 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(50% 50% at 0% 50%, rgba(15,58,125,0.4) 0%, transparent 60%), radial-gradient(50% 50% at 100% 100%, rgba(249,115,22,0.12) 0%, transparent 60%)',
        }}
      />

      <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-3 lg:items-stretch">
        <div className="flex flex-col justify-center lg:pr-8">
          <span className="mb-3 inline-flex self-start rounded-full border border-[#F97316]/30 bg-[#F97316]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#F97316]">
            Real contractors. Real results.
          </span>
          <h2 className="text-[clamp(26px,4vw,40px)] font-black leading-[1.1] tracking-[-0.02em] text-white">
            Built for the job site, not the office.
          </h2>
          <p className="mt-4 max-w-[460px] text-[16px] leading-relaxed text-white/60">
            From roofing to remodeling, Ezly fits the way you already work —
            keeping you connected whether you&apos;re on-site or on the road.
          </p>
          <a
            href="#how-it-works"
            className="mt-7 inline-flex min-h-[48px] items-center justify-center gap-2 self-start rounded-xl bg-gradient-to-r from-[#5468FF] to-[#0F3A7D] px-6 py-3 text-[14px] font-bold text-white shadow-[0_6px_20px_-4px_rgba(84,104,255,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-4px_rgba(84,104,255,0.7)]"
          >
            See how it works <span aria-hidden="true">→</span>
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <div className="relative col-span-2 row-span-1 overflow-hidden rounded-2xl border border-white/10 sm:col-span-1 sm:row-span-2">
            <img
              src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=800&fit=crop&q=80"
              alt="Contractor on roof"
              loading="lazy"
              className="h-56 w-full object-cover transition-transform duration-500 hover:scale-105 sm:h-full"
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0B1F]/70 to-transparent" />
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/10">
            <img
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=380&fit=crop&q=80"
              alt="Kitchen renovation"
              loading="lazy"
              className="h-40 w-full object-cover transition-transform duration-500 hover:scale-105 sm:h-full"
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0B1F]/60 to-transparent" />
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/10">
            <img
              src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=380&fit=crop&q=80"
              alt="Home improvement"
              loading="lazy"
              className="h-40 w-full object-cover transition-transform duration-500 hover:scale-105 sm:h-full"
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0B1F]/60 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  )
}
