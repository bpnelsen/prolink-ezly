// LEGAL REVIEW NEEDED — this boilerplate must be reviewed by legal counsel before launch.
// It is intended as a starting point only and does not constitute legal advice.

export const metadata = { title: 'Cookie policy' }

export default function CookiePolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-6">
        <ol className="flex items-center gap-2">
          <li><a href="/" className="text-[#0f3a7d] hover:underline">Home</a></li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-700" aria-current="page">Cookie policy</li>
        </ol>
      </nav>

      <h1 className="text-3xl font-black text-[#0f3a7d] mb-6">Cookie policy</h1>

      <p className="text-gray-700 mb-6">
        This page explains how EZLY uses cookies and similar technologies on useezly.com.
      </p>

      <h2 className="text-2xl font-bold text-[#0f3a7d] mt-8 mb-3">What are cookies?</h2>
      <p className="text-gray-700 mb-4">
        Cookies are small text files stored on your device when you visit a website. They help the
        site remember your actions and preferences (such as login, language, or font size).
      </p>

      <h2 className="text-2xl font-bold text-[#0f3a7d] mt-8 mb-3">Categories we use</h2>
      <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
        <li><strong>Strictly necessary</strong> — required for the site to function. Always on.</li>
        <li><strong>Analytics</strong> — measures how the site is used so we can improve it.</li>
        <li><strong>Marketing</strong> — measures ad performance and supports relevant offers.</li>
        <li><strong>Personalization</strong> — remembers your choices to tailor the experience.</li>
      </ul>

      <h2 className="text-2xl font-bold text-[#0f3a7d] mt-8 mb-3">Your choices</h2>
      <p className="text-gray-700 mb-4">
        You can change your preferences any time from the{' '}
        <a href="/cookie-preferences" className="text-[#0f3a7d] underline hover:no-underline">
          Cookie preferences
        </a>{' '}
        page. If your browser sends a Global Privacy Control (GPC) signal, we will honor it automatically.
      </p>

      <h2 className="text-2xl font-bold text-[#0f3a7d] mt-8 mb-3">California residents</h2>
      <p className="text-gray-700 mb-4">
        California residents have the right to opt out of the sale or sharing of personal information.
        Use the &ldquo;Do Not Sell or Share My Personal Information&rdquo; link in our footer or banner.
      </p>

      <h2 className="text-2xl font-bold text-[#0f3a7d] mt-8 mb-3">Contact</h2>
      <p className="text-gray-700">
        Questions? <a href="/contact" className="text-[#0f3a7d] underline hover:no-underline">Contact us</a>.
      </p>

      <div className="mt-12 pt-6 border-t border-gray-200">
        <a href="/" className="text-[#0f3a7d] hover:underline">&larr; Back to home</a>
      </div>
    </div>
  )
}
