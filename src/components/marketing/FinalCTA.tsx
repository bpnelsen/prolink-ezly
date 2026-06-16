import Link from 'next/link'

/**
 * Closing CTA band. Dark hero-style finale with layered gradient orbs,
 * a dramatic gradient headline, and dual CTAs. CTAs stack on mobile.
 */
export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[#0B0B1F] px-4 py-24 text-center sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(84,104,255,0.30) 0%, transparent 60%), radial-gradient(50% 60% at 0% 100%, rgba(15,58,125,0.45) 0%, transparent 70%), radial-gradient(50% 60% at 100% 100%, rgba(249,115,22,0.18) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.2]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-black tracking-tighter text-white/[0.04] md:block"
        style={{ fontSize: 'clamp(80px,12vw,160px)' }}
      >
        EZLY
      </div>

      <div className="relative z-10 mx-auto max-w-[760px]">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 backdrop-blur-md">
          <span className="relative inline-block h-[7px] w-[7px] rounded-full bg-[#5468FF] shadow-[0_0_0_3px_rgba(84,104,255,0.25)]" />
          <span className="text-[12px] font-semibold tracking-wide text-white/80">
            Join 500+ contractors growing with Ezly
          </span>
        </div>

        <h2 className="text-[clamp(28px,5.2vw,52px)] font-black leading-[1.08] tracking-[-0.02em] text-white">
          Ready to run your business{' '}
          <span className="bg-gradient-to-r from-[#5468FF] via-[#7B8AFF] to-[#F97316] bg-clip-text text-transparent">
            better?
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-[540px] text-[17px] text-white/65">
          Set up in minutes. Cancel anytime. Your free 14-day trial starts the moment you sign up.
        </p>

        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Link
            href="/signup"
            className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5468FF] to-[#0F3A7D] px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_28px_-4px_rgba(84,104,255,0.55)] ring-1 ring-white/15 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-4px_rgba(84,104,255,0.7)]"
          >
            Start your free trial
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-7 py-3.5 text-[15px] font-bold text-white backdrop-blur-md transition-colors hover:border-white/40 hover:bg-white/[0.08]"
          >
            Talk to sales
          </Link>
        </div>

        <p className="mt-7 text-sm text-white/55">
          Already a member?{' '}
          <Link
            href="/login"
            className="ml-1 inline-flex items-center border-b border-white/40 pb-[1px] font-bold text-white transition-colors hover:border-white"
          >
            Sign in to your dashboard →
          </Link>
        </p>
      </div>
    </section>
  )
}
