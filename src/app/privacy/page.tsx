'use client'

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-black text-[#0f3a7d] mb-4">Privacy Policy</h1>
      <p className="text-gray-600 mb-8">Last updated: {new Date().toISOString().slice(0, 10)}</p>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Overview</h2>
          <p>
            We respect your privacy. This Privacy Policy explains how we collect, use, and protect information when you use Prolink by EZLY.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Information we collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Account information you provide (e.g., name, email).</li>
            <li>Profile/business details you enter during signup.</li>
            <li>Messages and activity related to using the platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">How we use information</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>To provide and improve the Prolink service.</li>
            <li>To authenticate users and manage accounts.</li>
            <li>To send important notifications (e.g., login, job updates).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cookies & analytics</h2>
          <p>
            We may use cookies and similar technologies to keep the service working and to understand usage.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Data security</h2>
          <p>
            We use reasonable technical and organizational measures designed to protect information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Your choices</h2>
          <p>
            You can request access, correction, or deletion of your information by contacting us.
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
