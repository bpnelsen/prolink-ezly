export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-black text-[#0f3a7d] mb-6">About EZLY</h1>

      <p className="text-gray-700 mb-6">
        EZLY builds CRM and workflow software for modern contractors. Our flagship product, Prolink,
        gives electricians, HVAC techs, plumbers, and home service pros a single place to run their
        business — from the first customer call to the final paid invoice.
      </p>

      <h2 className="text-2xl font-bold text-[#0f3a7d] mt-10 mb-4">Why we built it</h2>
      <p className="text-gray-700 mb-6">
        Most contractor software was designed for office staff, not for the people doing the work.
        We talked to dozens of owner-operators and small crews who were juggling spreadsheets,
        sticky notes, group texts, and three different apps just to get through a day. EZLY exists
        to replace all of that with one tool that works the way the trades actually work.
      </p>

      <h2 className="text-2xl font-bold text-[#0f3a7d] mt-10 mb-4">What we believe</h2>
      <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
        <li><strong>Simple beats clever.</strong> If a feature needs a tutorial, we redesign it.</li>
        <li><strong>The field comes first.</strong> Every feature has to work on a phone, in a truck, with one bar of signal.</li>
        <li><strong>Your data is yours.</strong> Export anything, anytime. No lock-in, no games.</li>
        <li><strong>Fair pricing.</strong> Flat, predictable plans — no per-job fees or surprise upcharges.</li>
      </ul>

      <h2 className="text-2xl font-bold text-[#0f3a7d] mt-10 mb-4">Who we serve</h2>
      <p className="text-gray-700 mb-6">
        From solo operators to growing crews of 25+, EZLY scales with you. Dispatch jobs, send
        estimates, collect payments, generate invoices, and keep customers in the loop — all from
        one place, on any device.
      </p>

      <h2 className="text-2xl font-bold text-[#0f3a7d] mt-10 mb-4">Get in touch</h2>
      <p className="text-gray-700">
        Questions, feedback, or want to see a demo? <a href="/contact" className="text-[#0f3a7d] underline">Reach out</a> — a real person on our team will get back to you.
      </p>
    </div>
  )
}
