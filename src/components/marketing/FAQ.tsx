'use client'

import { useState } from 'react'

/**
 * FAQ accordion. One item open at a time; clicking the open item closes
 * it. Uses simple max-height transitions (no JS measuring) so the open
 * area stays flexible for long answers without overflow clipping.
 */
export function FAQ() {
  const items = [
    {
      q: 'What is EZLY?',
      a: 'EZLY is a CRM and workflow management platform built specifically for contractors. It helps you manage customers, jobs, invoicing, and leads — all in one place.',
    },
    {
      q: 'Can I import my existing customers?',
      a: 'Yes! Import your existing customer list via CSV upload. Most contractors are up and running in under 15 minutes.',
    },
    {
      q: 'Is there a free trial?',
      a: 'Absolutely. Start with a 14-day free trial. No credit card required. Cancel anytime — no strings attached.',
    },
    {
      q: 'How does pricing work?',
      a: 'One flat price: $49/month for unlimited users. Add your whole crew at no extra cost. No per-seat fees, no per-job fees, no surprise upcharges — ever.',
    },
    {
      q: 'What happens after my trial ends?',
      a: 'You stay on the same flat $49/month plan — unlimited users, everything included. Monthly or annual billing, with a discount when you pay annually.',
    },
    {
      q: 'Is my data secure?',
      a: 'Yes. We use bank-level 256-bit SSL encryption, daily backups, and SOC-2 compliant hosting. Your data is always yours.',
    },
  ]

  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-24 bg-gray-50 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        <div className="mb-10 text-center sm:mb-12">
          <span className="font-['Inter',sans-serif] text-[11px] font-bold uppercase tracking-[0.12em] text-[#F97316]">
            FAQ
          </span>
          <h2 className="mx-auto mt-2.5 font-['Inter',sans-serif] text-[clamp(24px,4vw,42px)] font-extrabold leading-[1.15] tracking-tight text-[#0F3A7D]">
            Got questions? We&apos;ve got answers.
          </h2>
        </div>

        <div className="mx-auto flex max-w-[680px] flex-col gap-2">
          {items.map((it, i) => {
            const isOpen = open === i
            return (
              <div
                key={it.q}
                className={`overflow-hidden rounded-2xl border bg-white transition-colors ${
                  isOpen ? 'border-[#F97316]' : 'border-gray-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  className={`flex w-full min-h-[56px] items-center justify-between gap-4 px-5 py-4 text-left font-['Inter',sans-serif] text-[15px] font-semibold transition-colors sm:px-6 sm:py-5 ${
                    isOpen ? 'text-[#0F3A7D]' : 'text-gray-900'
                  }`}
                >
                  <span className="min-w-0">{it.q}</span>
                  <span
                    aria-hidden="true"
                    className={`flex-shrink-0 text-lg leading-none transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#F97316]' : 'text-gray-400'
                    }`}
                  >
                    ⌄
                  </span>
                </button>
                <div
                  id={`faq-panel-${i}`}
                  className={`grid px-5 text-sm leading-relaxed text-gray-600 transition-[grid-template-rows,padding] duration-300 sm:px-6 ${
                    isOpen
                      ? 'grid-rows-[1fr] pb-5'
                      : 'grid-rows-[0fr] pb-0'
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
