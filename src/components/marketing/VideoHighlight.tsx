/**
 * Hero video highlight. Embeds the self-contained animated Prolink explainer
 * (public/prolink-video.html — a standalone React/Babel bundle) inside a
 * responsive 16:9 iframe. Sits directly under the Hero so it's the visual
 * centerpiece of the marketing page. Dark theme matches the hero for a
 * seamless transition.
 */
export function VideoHighlight() {
  return (
    <section
      id="video"
      aria-label="Product video"
      className="relative scroll-mt-24 overflow-hidden bg-[#0B0B1F] py-20 sm:py-24 lg:py-28"
    >
      {/* Gradient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(55% 50% at 50% 0%, rgba(84,104,255,0.28) 0%, transparent 65%), radial-gradient(45% 45% at 50% 100%, rgba(249,115,22,0.14) 0%, transparent 70%)',
        }}
      />
      {/* Bottom fade into next (light) section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white"
      />

      <div className="relative z-10 mx-auto max-w-[1100px] px-4 sm:px-6">
        <div className="mb-10 text-center sm:mb-12">
          <span className="inline-block rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/70 backdrop-blur-md">
            Watch the 60-second tour
          </span>
          <h2 className="mx-auto mt-4 max-w-[720px] text-[clamp(28px,4.8vw,46px)] font-extrabold leading-[1.1] tracking-[-0.02em] text-white">
            See your whole business{' '}
            <span className="bg-gradient-to-r from-[#5468FF] via-[#7B8AFF] to-[#F97316] bg-clip-text text-transparent">
              run itself
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-relaxed text-white/60 sm:text-[17px]">
            From the first lead to the final invoice — here&apos;s everything
            Prolink does for you, in one minute.
          </p>
        </div>

        {/* Glow halo behind the player */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-6 rounded-[2rem] opacity-60 blur-3xl"
            style={{
              background:
                'radial-gradient(50% 50% at 50% 50%, rgba(84,104,255,0.45) 0%, transparent 70%)',
            }}
          />

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_40px_90px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
              <span className="ml-3 text-[10px] font-semibold text-white/40">
                useezly.com — product tour
              </span>
            </div>

            {/* Responsive 16:9 iframe */}
            <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
              <iframe
                src="/prolink-video.html"
                title="Prolink product tour"
                loading="lazy"
                allow="autoplay; fullscreen"
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
