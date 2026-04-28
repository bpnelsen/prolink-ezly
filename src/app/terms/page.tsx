'use client'

export default function TermsOfServicePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-black text-[#0f3a7d] mb-4">Terms of Service</h1>
      <p className="text-gray-600 mb-8">Last updated: {new Date().toISOString().slice(0, 10)}</p>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acceptance</h2>
          <p>
            By using Prolink by EZLY, you agree to these Terms of Service. If you do not agree, do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Use of the service</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>You will provide accurate information.</li>
            <li>You will not misuse the service or attempt unauthorized access.</li>
            <li>You are responsible for activity under your account.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Account & security</h2>
          <p>
            Keep your login credentials secure. We may suspend access if we suspect fraud, security issues, or policy violations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Payments</h2>
          <p>
            If the service includes paid plans, billing will be handled according to the plan details at the time of purchase.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, Prolink by EZLY is not liable for indirect or consequential damages.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Changes to these terms</h2>
          <p>
            We may update these Terms from time to time. Continued use after changes means you accept the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Contact</h2>
          <p>
            Questions? Email <a className="text-[#0f3a7d] underline" href="mailto:support@useezly.com">support@useezly.com</a>.
          </p>
        </section>

        <p className="text-xs text-gray-500 pt-2">
          Note: This is a template draft. You should have legal counsel review it for your specific business practices.
        </p>
      </div>
    </main>
  )
}
