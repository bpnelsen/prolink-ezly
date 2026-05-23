import Link from 'next/link'

/**
 * Final closing call-to-action band. CTAs stack on mobile, sit
 * side-by-side on >=sm.
 */
export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[#0F3A7D] px-4 py-20 text-center sm:py-24">
      {/* Background photo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1600&h=700&fit=crop&q=70')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Gradient overlays */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(15,58,125,.85) 0%, rgba(15,58,125,.75) 100%), radial-gradient(ellipse 50% 80% at 90% 50%, rgba(20,184,166,.2) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 5% 60%, rgba(249,115,22,.1) 0%, transparent 60%)',
        }}
      />
      {/* Big decorative wordmark (hidden on small screens to avoid layout collision) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-['Inter',sans-serif] font-black tracking-tighter text-white/[0.04] md:block"
        style={{ fontSize: 'clamp(64px,10vw,120px)' }}
      >
        EZLY
      </div>

      <div className="relative z-10 mx-auto max-w-[720px]">
        <h2 className="font-['Inter',sans-serif] text-[clamp(26px,5vw,48px)] font-black leading-[1.15] tracking-tight text-white">
          Ready to run your business <span className="text-[#F97316]">better?</span>
        </h2>
        <p className="mx-auto mt-4 max-w-[520px] text-base text-white/60 sm:text-[17px]">
          Join hundreds of contractors who&apos;ve already made the switch.
        </p>

        <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Link
            href="/signup"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#F97316] px-7 py-3.5 font-['Inter',sans-serif] text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(249,115,22,0.3)] transition-all hover:-translate-y-px hover:bg-[#e05f0a]"
          >
            Start Your Free Trial →
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-white/35 bg-transparent px-7 py-3.5 font-['Inter',sans-serif] text-[15px] font-bold text-white transition-colors hover:border-white/60 hover:bg-white/10"
          >
            Talk to Sales
          </Link>
        </div>

        <p className="mt-6 font-['Inter',sans-serif] text-sm text-white/50">
          Already a member?{' '}
          <Link
            href="/login"
            className="ml-1 inline-flex items-center border-b border-white/40 pb-[1px] font-bold text-white transition-colors hover:border-white"
          >
            Sign In to your dashboard →
          </Link>
        </p>
      </div>
    </section>
  )
}
