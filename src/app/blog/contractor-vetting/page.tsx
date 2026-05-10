export default function VettingContractorPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-6">
        <ol className="flex items-center gap-2">
          <li><a href="/" className="text-[#0f3a7d] hover:underline">Home</a></li>
          <li aria-hidden="true">/</li>
          <li><a href="/blog" className="text-[#0f3a7d] hover:underline">Blog</a></li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-700 line-clamp-1" aria-current="page">Building a Network of Trusted Subs</li>
        </ol>
      </nav>
      <img src="/blog/contractor-vetting.jpg" alt="" className="w-full rounded-2xl mb-8 object-cover" style={{ height:"320px", width:"100%" }} />
      <h1 className="text-3xl font-black text-[#0f3a7d] mb-4">Building a Network of Trusted Subs</h1>
      <p className="text-gray-500 mb-8">How to vet and maintain a high-quality subcontractor pool.</p>
      <div className="prose prose-teal max-w-none text-gray-700">
        <p>Reliable subs are the secret to scaling your contracting business without losing quality control.</p>
        <h2 className="text-xl font-bold mt-6 mb-2">Formal Vetting Process</h2>
        <p>Require more than just a certificate of insurance. Ask for documented experience and references from other local general contractors.</p>
        <h2 className="text-xl font-bold mt-6 mb-2">Performance Tracking</h2>
        <p>Track everything from timeliness to clean-up effectiveness. A CRM like Prolink makes this easy.</p>
        <h2 className="text-xl font-bold mt-6 mb-2"> Clear Expectations</h2>
        <p>Use detailed, standardized agreements for every job to reduce communication friction.</p>
      </div>
    </main>
  )
}
