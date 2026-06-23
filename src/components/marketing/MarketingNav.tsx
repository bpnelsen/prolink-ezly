'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

/**
 * Glass-morphism marketing nav. Stays semi-transparent white with a
 * backdrop blur so it reads cleanly over both the dark hero and the
 * lighter sections below.
 */
export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 bg-white transition-all duration-300 ${
        scrolled
          ? 'border-b border-gray-200 shadow-[0_2px_24px_rgba(15,23,42,0.06)]'
          : 'border-b border-gray-100'
      }`}
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div
          className={`flex flex-wrap items-center justify-between gap-2 transition-[padding] duration-300 ${
            scrolled ? 'py-1.5' : 'py-2.5'
          }`}
        >
          <Link href="/" className="shrink-0" aria-label="Ezly home">
            <Image
              src="/ezly-logo-cropped.png"
              alt="Ezly Home Services"
              width={170}
              height={48}
              priority
              className={`h-auto transition-[width] duration-300 ${
                scrolled ? 'w-[120px]' : 'w-[140px] md:w-[170px]'
              }`}
              style={{ mixBlendMode: 'multiply' }}
            />
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            <a href="/#features" className="rounded-lg px-3 py-2 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-emerald-500 hover:text-white">
              Features
            </a>
            <a href="/#how-it-works" className="rounded-lg px-3 py-2 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-emerald-500 hover:text-white">
              How it works
            </a>
            <a href="/#pricing" className="rounded-lg px-3 py-2 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-emerald-500 hover:text-white">
              Pricing
            </a>
            <Link href="/blog" className="rounded-lg px-3 py-2 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-emerald-500 hover:text-white">
              Blog
            </Link>
            <a href="/#faq" className="rounded-lg px-3 py-2 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-emerald-500 hover:text-white">
              FAQ
            </a>
          </div>

          <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-end">
            <Link
              href="/login"
              className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg border-2 border-[#5468FF] bg-white px-4 text-[13.5px] font-bold text-[#0F3A7D] shadow-[0_2px_8px_-2px_rgba(84,104,255,0.25)] transition-all hover:-translate-y-px hover:bg-[#5468FF] hover:text-white hover:shadow-[0_6px_16px_-3px_rgba(84,104,255,0.5)] sm:flex-none sm:px-5"
            >
              Contractor Portal
            </Link>
            <Link
              href="/portal/login"
              className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg border-2 border-[#5468FF] bg-white px-4 text-[13.5px] font-bold text-[#0F3A7D] shadow-[0_2px_8px_-2px_rgba(84,104,255,0.25)] transition-all hover:-translate-y-px hover:bg-[#5468FF] hover:text-white hover:shadow-[0_6px_16px_-3px_rgba(84,104,255,0.5)] sm:flex-none sm:px-5"
            >
              Homeowner Portal
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#0F3A7D] to-[#5468FF] px-4 py-2 text-[13.5px] font-bold text-white shadow-[0_4px_14px_-2px_rgba(84,104,255,0.45)] transition-all hover:-translate-y-px hover:shadow-[0_6px_18px_-2px_rgba(84,104,255,0.6)] sm:w-auto sm:px-5"
            >
              Get started <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
