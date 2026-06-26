'use client'

import Link from 'next/link'
import { useState } from 'react'

/**
 * Algolia-style dark hero with gradient orbs, grid overlay, and a
 * click-to-play YouTube video where the dashboard mockup used to be.
 *
 * To use a different video, swap the constants below. `HERO_VIDEO_ID`
 * is the YouTube video ID (the bit after `v=` in a YouTube URL, e.g.
 * `dQw4w9WgXcQ`). `HERO_VIDEO_POSTER` is optional — by default it uses
 * YouTube's own maxres thumbnail; set it to a path under /public/ if
 * you want a custom poster.
 */
const HERO_VIDEO_ID = 'REPLACE_WITH_YOUTUBE_VIDEO_ID'
const HERO_VIDEO_POSTER: string | null = null // e.g. '/videos/hero-poster.jpg'

const posterUrl =
  HERO_VIDEO_POSTER ?? `https://img.youtube.com/vi/${HERO_VIDEO_ID}/maxresdefault.jpg`

export function Hero() {
  return (
    <section
      className="relative overflow-hidden bg-[#0B0B1F] pt-32 pb-20 sm:pt-36 sm:pb-24 lg:pt-44 lg:pb-32"
      aria-label="Hero"
    >
      {/* Layered gradient orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 80% 20%, rgba(84,104,255,0.30) 0%, transparent 60%), radial-gradient(50% 50% at 20% 80%, rgba(249,115,22,0.18) 0%, transparent 60%), radial-gradient(70% 60% at 50% 100%, rgba(15,58,125,0.45) 0%, transparent 70%)',
        }}
      />
      {/* Subtle dot grid overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Bottom fade into next section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#0B0B1F]"
      />

      <div className="relative z-10 mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 backdrop-blur-md">
            <span className="relative inline-block h-[7px] w-[7px] rounded-full bg-[#5468FF] shadow-[0_0_0_3px_rgba(84,104,255,0.25)]" />
            <span className="text-[12px] font-semibold tracking-wide text-white/80">
              Built for Contractors, by Contractors
            </span>
          </div>
          <h1 className="font-['Inter',sans-serif] text-[clamp(36px,6.2vw,64px)] font-black leading-[1.04] tracking-[-0.02em] text-white">
            Run your business
            <br />
            <span
              className="bg-gradient-to-r from-[#5468FF] via-[#7B8AFF] to-[#F97316] bg-clip-text text-transparent"
            >
              on autopilot.
            </span>
          </h1>
          <p className="mt-6 max-w-[480px] text-[17px] leading-relaxed text-white/65 sm:text-[18px]">
            Scheduling, dispatch, CRM, invoicing, contracts, client portal,
            automations — plus a public website that brings in new leads.
            One platform, end to end.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Link
              href="/signup"
              className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5468FF] to-[#0F3A7D] px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_28px_-4px_rgba(84,104,255,0.55)] ring-1 ring-white/15 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-4px_rgba(84,104,255,0.7)]"
            >
              Start free trial
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-7 py-3.5 text-[15px] font-bold text-white backdrop-blur-md transition-colors hover:border-white/40 hover:bg-white/[0.08]"
            >
              See how it works
            </a>
          </div>

          <p className="mt-7 text-[13px] tracking-wide text-white/75">
            <strong className="font-bold text-white/90">14-day free trial</strong>
            <span className="mx-2 text-white/30">·</span>
            <span>No credit card required</span>
            <span className="mx-2 text-white/30">·</span>
            <span>Cancel anytime</span>
          </p>
        </div>

        {/* Click-to-play hero video */}
        <div className="relative hidden md:block">
          {/* Glow halo behind player */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-8 rounded-[2rem] opacity-60 blur-3xl"
            style={{
              background:
                'radial-gradient(50% 50% at 50% 50%, rgba(84,104,255,0.5) 0%, transparent 70%)',
            }}
          />

          {/* Floating bottom card */}
          <div className="absolute -bottom-3 -left-3 z-20 hidden items-center gap-2.5 rounded-2xl border border-white/15 bg-white/[0.08] px-3.5 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl xl:flex">
            <div className="text-xl" aria-hidden="true">
              🎉
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/50">New lead</div>
              <div className="text-sm font-extrabold text-[#F97316]">
                $4,200 Roofing Job
              </div>
            </div>
          </div>

          <HeroVideo videoId={HERO_VIDEO_ID} posterUrl={posterUrl} />
        </div>
      </div>
    </section>
  )
}

function HeroVideo({ videoId, posterUrl }: { videoId: string; posterUrl: string }) {
  const [playing, setPlaying] = useState(false)
  const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]">
      {playing ? (
        <iframe
          src={embedSrc}
          title="Ezly product video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label="Play product video"
          className="group absolute inset-0 h-full w-full overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={posterUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {/* Dark gradient so the play button reads on any thumbnail */}
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40"
          />
          {/* Play button */}
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-[0_12px_40px_rgba(84,104,255,0.5)] backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:bg-white"
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="#0B0B1F" className="ml-1">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  )
}
