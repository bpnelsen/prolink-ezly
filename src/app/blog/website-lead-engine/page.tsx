'use client'

import { MarketingFooter } from '@/components/marketing/MarketingFooter'

export default function WebsiteLeadEngine() {
  return (
    <>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-6">
          <ol className="flex items-center gap-2">
            <li><a href="/" className="text-[#0f3a7d] hover:underline">Home</a></li>
            <li aria-hidden="true">/</li>
            <li><a href="/blog" className="text-[#0f3a7d] hover:underline">Blog</a></li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-700 line-clamp-1" aria-current="page">Turn Your Website Into a 24/7 Lead Engine</li>
          </ol>
        </nav>
        <img
          src="/blog/website-lead-engine.jpg"
          alt=""
          className="w-full rounded-2xl mb-8 object-cover"
          style={{ height: '320px', width: '100%' }}
        />
        <h1 className="text-3xl font-black text-[#0f3a7d] mb-4">Turn Your Website Into a 24/7 Lead Engine</h1>
        <p className="text-gray-500 mb-8">How a built-in quote form turns weekend visitors into Monday-morning jobs.</p>

        <div className="prose prose-teal max-w-none text-gray-700">
          <p>
            For most contractors, the website is a glorified business card —
            a logo, a phone number, and a contact form that goes to an inbox
            nobody checks until Tuesday. That&apos;s a leak. The homeowner
            searching for a roofer at 9pm on Saturday isn&apos;t waiting
            three days for a callback.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-2">Capture, don&apos;t collect</h2>
          <p>
            A real lead engine does three things the second a visitor fills
            out a form: routes the request into your pipeline, notifies the
            right person, and sends an instant confirmation back to the
            homeowner. No inbox triage. No &quot;did anyone reply to this?&quot;
            on Monday.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-2">Make the form do the qualifying</h2>
          <p>
            Skip the open-ended &quot;tell us about your project&quot; box.
            Ask service type, address, timeline, and budget range. You&apos;ll
            cut your follow-up time in half because the lead is already
            scoped when you pick up the phone.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-2">Same-day follow-up beats best-in-class pricing</h2>
          <p>
            Studies of home-services calls keep landing on the same number:
            the contractor who responds first wins the job somewhere
            between 35% and 50% of the time, regardless of price. Speed is
            the cheapest competitive advantage you can buy.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-2">Wire it to the rest of your workflow</h2>
          <p>
            The lead form is step one. Once it&apos;s in your pipeline, the
            same record should drive the estimate, the contract, the
            invoice, and the follow-up automations. One workflow, one
            source of truth — that&apos;s how a website stops being a
            brochure and starts being a salesperson.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </>
  )
}
