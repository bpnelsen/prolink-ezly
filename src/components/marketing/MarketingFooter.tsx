'use client'

import Link from 'next/link'
import { useConsent } from '@/hooks/useConsent'

export function MarketingFooter() {
  const { regime, openPreferences, rejectAll } = useConsent()

  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="text-lg font-black text-[#0f3a7d]">
              EZLY
            </Link>
            <p className="mt-3 text-sm text-gray-600">
              CRM and workflow management built for modern contractors.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Company</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/about" className="text-gray-700 hover:text-[#0f3a7d]">About</Link></li>
              <li><Link href="/blog" className="text-gray-700 hover:text-[#0f3a7d]">Blog</Link></li>
              <li><Link href="/contact" className="text-gray-700 hover:text-[#0f3a7d]">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Account</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/login" className="text-gray-700 hover:text-[#0f3a7d]">Sign In</Link></li>
              <li><Link href="/signup" className="text-gray-700 hover:text-[#0f3a7d]">Sign Up</Link></li>
              <li><Link href="/dashboard" className="text-gray-700 hover:text-[#0f3a7d]">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/privacy" className="text-gray-700 hover:text-[#0f3a7d]">Privacy</Link></li>
              <li><Link href="/terms" className="text-gray-700 hover:text-[#0f3a7d]">Terms</Link></li>
              <li><Link href="/cookie-policy" className="text-gray-700 hover:text-[#0f3a7d]">Cookie Policy</Link></li>
              <li>
                <button
                  type="button"
                  onClick={openPreferences}
                  className="text-gray-700 hover:text-[#0f3a7d]"
                >
                  Cookie Preferences
                </button>
              </li>
              {regime === 'ccpa' && (
                <li>
                  <button
                    type="button"
                    onClick={rejectAll}
                    className="text-gray-700 hover:text-[#0f3a7d]"
                  >
                    Do Not Sell or Share My Personal Information
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-gray-100 pt-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} EZLY. All rights reserved.</span>
          <span>Made for contractors who hate paperwork.</span>
        </div>
      </div>
    </footer>
  )
}
