'use client'

import Link from 'next/link'
import { useConsent } from '@/hooks/useConsent'

export function MarketingFooter() {
  const { regime, openPreferences, rejectAll } = useConsent()

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#0B0B1F] text-white/70">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(50% 60% at 0% 0%, rgba(84,104,255,0.15) 0%, transparent 60%)',
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="bg-gradient-to-r from-white to-[#7B8AFF] bg-clip-text text-xl font-black text-transparent">
              EZLY
            </Link>
            <p className="mt-3 max-w-[260px] text-[13.5px] leading-relaxed text-white/55">
              CRM, dispatch, invoicing, contracts, client portal, automations, and a website that brings in leads — built for contractors.
            </p>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">Product</h4>
            <ul className="mt-4 space-y-2.5 text-[13.5px]">
              <li><a href="/#features" className="text-white/70 transition-colors hover:text-white">Features</a></li>
              <li><a href="/#how-it-works" className="text-white/70 transition-colors hover:text-white">How it works</a></li>
              <li><a href="/#pricing" className="text-white/70 transition-colors hover:text-white">Pricing</a></li>
              <li><a href="/#faq" className="text-white/70 transition-colors hover:text-white">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">Company</h4>
            <ul className="mt-4 space-y-2.5 text-[13.5px]">
              <li><Link href="/about" className="text-white/70 transition-colors hover:text-white">About</Link></li>
              <li><Link href="/blog" className="text-white/70 transition-colors hover:text-white">Blog</Link></li>
              <li><Link href="/contact" className="text-white/70 transition-colors hover:text-white">Contact</Link></li>
              <li><Link href="/login" className="text-white/70 transition-colors hover:text-white">Sign in</Link></li>
              <li><Link href="/signup" className="text-white/70 transition-colors hover:text-white">Sign up</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">Legal</h4>
            <ul className="mt-4 space-y-2.5 text-[13.5px]">
              <li><Link href="/privacy" className="text-white/70 transition-colors hover:text-white">Privacy</Link></li>
              <li><Link href="/terms" className="text-white/70 transition-colors hover:text-white">Terms</Link></li>
              <li><Link href="/cookie-policy" className="text-white/70 transition-colors hover:text-white">Cookie Policy</Link></li>
              <li>
                <button
                  type="button"
                  onClick={openPreferences}
                  className="text-white/70 transition-colors hover:text-white"
                >
                  Cookie Preferences
                </button>
              </li>
              {regime === 'ccpa' && (
                <li>
                  <button
                    type="button"
                    onClick={rejectAll}
                    className="text-left text-white/70 transition-colors hover:text-white"
                  >
                    Do Not Sell or Share My Personal Information
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Ezly. All rights reserved.</span>
          <span>Made for contractors who hate paperwork.</span>
        </div>
      </div>
    </footer>
  )
}
