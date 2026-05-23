'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

/**
 * Sticky top navigation for the marketing homepage. Becomes more compact
 * with a subtle shadow once the user has scrolled past 40px. Mobile layout
 * stacks the action buttons in a full-width row below the logo and hides
 * the secondary link row (the page anchors are still reachable via the
 * footer and direct anchor links).
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
      className={`fixed top-0 inset-x-0 z-50 bg-white transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_2px_20px_rgba(0,0,0,0.07)] border-b border-gray-200' : 'border-b border-transparent'
      }`}
    >
      <div className="max-w-[1160px] mx-auto px-4 sm:px-6">
        {/* Row 1: Logo + Actions */}
        <div
          className={`flex flex-wrap items-center justify-between gap-2 transition-[padding] duration-300 ${
            scrolled ? 'py-1' : 'py-1.5'
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

          <div className="flex w-full sm:w-auto items-center justify-center sm:justify-end gap-2 flex-wrap">
            <Link
              href="/login"
              className="flex-1 sm:flex-none text-center min-h-[44px] inline-flex items-center justify-center px-3 sm:px-5 py-2.5 rounded-[11px] border-2 border-[#0F3A7D] text-[#0F3A7D] font-extrabold text-[13.5px] sm:text-[15px] font-['Inter',sans-serif] whitespace-nowrap hover:bg-[#0F3A7D] hover:text-white transition-colors"
            >
              Contractor Log in
            </Link>
            <Link
              href="/portal/login"
              className="flex-1 sm:flex-none text-center min-h-[44px] inline-flex items-center justify-center px-3 sm:px-5 py-2.5 rounded-[11px] border-2 border-[#0F3A7D] text-[#0F3A7D] font-extrabold text-[13.5px] sm:text-[15px] font-['Inter',sans-serif] whitespace-nowrap hover:bg-[#0F3A7D] hover:text-white transition-colors"
            >
              Homeowner Log in
            </Link>
            <Link
              href="/signup"
              className="flex-1 sm:flex-none text-center min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 sm:px-6 py-3 rounded-[11px] bg-[#F97316] text-white font-extrabold text-[13.5px] sm:text-[15px] font-['Inter',sans-serif] whitespace-nowrap shadow-[0_2px_8px_rgba(249,115,22,0.3)] hover:bg-[#e05f0a] hover:-translate-y-px transition-all"
            >
              Get Started <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* Row 2: Section links (hidden on mobile) */}
        <div
          className={`hidden md:flex items-center border-t border-gray-100 transition-[padding] duration-300 ${
            scrolled ? 'py-1' : 'py-1.5'
          }`}
        >
          <div className="flex items-center gap-7 flex-wrap">
            <a href="/#features" className="font-['Inter',sans-serif] text-xs font-semibold text-gray-500 hover:text-[#0F3A7D] transition-colors">
              Features
            </a>
            <Link href="/blog" className="font-['Inter',sans-serif] text-xs font-semibold text-gray-500 hover:text-[#0F3A7D] transition-colors">
              Blog
            </Link>
            <a href="/#how-it-works" className="font-['Inter',sans-serif] text-xs font-semibold text-gray-500 hover:text-[#0F3A7D] transition-colors">
              How It Works
            </a>
            <a href="/#pricing" className="font-['Inter',sans-serif] text-xs font-semibold text-gray-500 hover:text-[#0F3A7D] transition-colors">
              Pricing
            </a>
            <a href="/#faq" className="font-['Inter',sans-serif] text-xs font-semibold text-gray-500 hover:text-[#0F3A7D] transition-colors">
              FAQ
            </a>
            <Link href="/contact" className="font-['Inter',sans-serif] text-xs font-semibold text-gray-500 hover:text-[#0F3A7D] transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
