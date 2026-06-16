'use client'

import { MarketingFooter } from '@/components/marketing/MarketingFooter'

export default function ContractorAutomations() {
  return (
    <>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-6">
          <ol className="flex items-center gap-2">
            <li><a href="/" className="text-[#0f3a7d] hover:underline">Home</a></li>
            <li aria-hidden="true">/</li>
            <li><a href="/blog" className="text-[#0f3a7d] hover:underline">Blog</a></li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-700 line-clamp-1" aria-current="page">5 Automations Every Contractor Should Turn On First</li>
          </ol>
        </nav>
        <img
          src="/blog/contractor-automations.jpg"
          alt=""
          className="w-full rounded-2xl mb-8 object-cover"
          style={{ height: '320px', width: '100%' }}
        />
        <h1 className="text-3xl font-black text-[#0f3a7d] mb-4">5 Automations Every Contractor Should Turn On First</h1>
        <p className="text-gray-500 mb-8">The trigger-based workflows that save the average crew 6 hours a week.</p>

        <div className="prose prose-teal max-w-none text-gray-700">
          <p>
            Automations sound complicated. They aren&apos;t. A good automation
            is just &quot;when this happens, send that.&quot; Wire up the right
            five and you&apos;ll claw back a full workday every week — without
            hiring an admin.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-2">1. Appointment confirmation SMS</h2>
          <p>
            Trigger: a job is scheduled. Action: text the homeowner with
            the date, the arrival window, and the tech&apos;s name. Cuts no-shows
            and the &quot;wait, you&apos;re coming today?&quot; calls.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-2">2. On-the-way text when the tech departs</h2>
          <p>
            Trigger: tech marks the previous job complete. Action: text the
            next customer an ETA with a tracking link. The Amazon-package
            experience, for roofing.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-2">3. Invoice-sent follow-up</h2>
          <p>
            Trigger: invoice sent more than three days ago, still unpaid.
            Action: send a polite reminder with the secure payment link.
            You&apos;ll get paid days earlier without an awkward phone call.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-2">4. Review request after job completion</h2>
          <p>
            Trigger: job marked complete. Action: wait 24 hours, then text
            a one-tap review link. Sending it while the work is fresh is
            the difference between 12 reviews a year and 200.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-2">5. Lead acknowledgement from your website</h2>
          <p>
            Trigger: someone submits the quote form on your contractor
            website. Action: instant email back with your service area and
            a calendar link to book a walkthrough — and an SMS to the
            owner so the lead doesn&apos;t cool off in an inbox.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-2">Start with one</h2>
          <p>
            Don&apos;t turn on all five at once. Pick the one that fixes
            your loudest pain — usually invoice follow-ups or the website
            lead acknowledgement — and let it run for a week before you
            add the next.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </>
  )
}
