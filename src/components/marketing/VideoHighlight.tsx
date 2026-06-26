'use client'

import { useState } from 'react'

/**
 * Hero video highlight. Embeds the self-contained animated Prolink explainer
 * (public/prolink-video.html — a standalone React/Babel bundle) inside a
 * responsive 16:9 frame. Sits directly under the Hero so it's the visual
 * centerpiece of the marketing page; dark theme matches the hero.
 *
 * Click-to-play: a branded poster is shown until the visitor clicks play,
 * at which point the iframe mounts. Mounting on click (rather than on page
 * load) gives the browser the user gesture it requires to let the video's
 * voiceover play *with sound* — autoplaying audio on load is blocked.
 */
export function VideoHighlight() {
  const [playing, setPlaying] = useState(false)

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

            {/* Responsive 16:9 stage: poster until clicked, then the iframe */}
            <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
              {playing ? (
                <iframe
                  src="/prolink-video.html"
                  title="Prolink product tour"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  aria-label="Play Prolink video"
                  className="group absolute inset-0 flex flex-col items-center justify-center gap-6 border-0 p-0"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 38%, #16356b 0%, #0E2143 60%, #060E1C 100%)',
                  }}
                >
                  <span className="flex items-center gap-3 sm:gap-4">
                    <svg
                      viewBox="0 0 40 40"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                      className="h-9 w-9 sm:h-12 sm:w-12"
                    >
                      <rect x="10" y="17" width="20" height="6" rx="3" fill="#fff" />
                      <circle cx="10" cy="20" r="8" fill="#fff" />
                      <circle cx="30" cy="20" r="8" fill="#F5620F" />
                    </svg>
                    <span className="text-[32px] font-extrabold tracking-[-0.04em] text-white sm:text-[46px]">
                      Prolink
                    </span>
                  </span>

                  <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#F5620F] shadow-[0_12px_36px_rgba(245,98,15,0.5)] transition-transform group-hover:scale-[1.07] sm:h-[84px] sm:w-[84px]">
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="ml-1 h-7 w-7 fill-white sm:h-[34px] sm:w-[34px]"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>

                  <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/65 sm:text-[15px]">
                    Watch · 60 sec
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
