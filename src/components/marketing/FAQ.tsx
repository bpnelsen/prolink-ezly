'use client'

import { useState } from 'react'

/**
 * FAQ accordion on a light section. Open item gets a soft Algolia-blue
 * gradient border + lift; closed items stay quiet so the focus tracks.
 */
export function FAQ() {
  const items = [
    {
      q: 'What is Ezly?',
      a: 'Ezly is an all-in-one operating system for contractors. CRM, dispatch and scheduling, invoicing, contracts, client portal, automations, and a public contractor website — all in one place.',
    },
    {
      q: 'Can I import my existing customers?',
      a: 'Yes. Import your existing customer list via CSV upload. Most contractors are up and running in under 15 minutes.',
    },
    {
      q: 'Do my customers need an app?',
      a: 'No app required. Your customers see jobs, invoices, contracts, and chat with you through a secure web portal — works on any phone or laptop.',
    },
    {
      q: 'Is there a free trial?',
      a: 'Absolutely. Start with a 14-day free trial. No credit card required. Cancel anytime — no strings attached.',
    },
    {
      q: 'How does the contractor website work?',
      a: 'When you sign up, Ezly generates a branded public website for your business — your services, photos, and service area, with a built-in quote form. Leads land straight in your pipeline so you can follow up the same day.',
    },
  ]

  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="relative scroll-mt-24 overflow-hidden bg-white py-20 sm:py-24 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            'radial-gradient(40% 30% at 50% 0%, rgba(84,104,255,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="mb-12 text-center sm:mb-14">
          <span className="inline-block rounded-full border border-[#5468FF]/20 bg-[#5468FF]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5468FF]">
            FAQ
          </span>
          <h2 className="mx-auto mt-4 max-w-[640px] text-[clamp(26px,4.5vw,44px)] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#0B0B1F]">
            Got questions? We&apos;ve got answers.
          </h2>
        </div>

        <div className="mx-auto flex max-w-[720px] flex-col gap-3">
          {items.map((it, i) => {
            const isOpen = open === i
            return (
              <div
                key={it.q}
                className={`overflow-hidden rounded-2xl transition-all ${
                  isOpen
                    ? 'border border-[#5468FF]/40 bg-gradient-to-br from-white via-white to-[#5468FF]/[0.04] shadow-[0_10px_30px_-10px_rgba(84,104,255,0.3)]'
                    : 'border border-gray-200 bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  className={`flex min-h-[60px] w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold transition-colors sm:px-6 sm:py-5 ${
                    isOpen ? 'text-[#0B0B1F]' : 'text-gray-800'
                  }`}
                >
                  <span className="min-w-0">{it.q}</span>
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-lg leading-none transition-all duration-200 ${
                      isOpen
                        ? 'rotate-180 bg-gradient-to-br from-[#5468FF] to-[#0F3A7D] text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    ⌄
                  </span>
                </button>
                <div
                  id={`faq-panel-${i}`}
                  className={`grid px-5 text-[14px] leading-relaxed text-gray-600 transition-[grid-template-rows,padding] duration-300 sm:px-6 ${
                    isOpen ? 'grid-rows-[1fr] pb-5' : 'grid-rows-[0fr] pb-0'
                  }`}
                >
                  <div className="overflow-hidden">{it.a}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
