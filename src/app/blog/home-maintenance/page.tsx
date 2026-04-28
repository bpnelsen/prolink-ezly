export default function HomeMaintenance() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-black text-[#0f3a7d] mb-4">Seasonal Home Maintenance Checklist</h1>
      <p className="text-gray-500 mb-8">Simple habits to keep your home in top shape.</p>
      <div className="prose prose-teal max-w-none text-gray-700">
        <p>Keeping a home maintained is better than a giant repair bill from neglect.</p>
        <h2 className="text-xl font-bold mt-6 mb-2">Spring/Summer</h2>
        <p>Service your AC, check for cracked exterior caulking, and clean up the landscape.</p>
        <h2 className="text-xl font-bold mt-6 mb-2">Fall/Winter</h2>
        <p>Clean gutters, drain exterior spigots to prevent freezing, and check smoke detectors.</p>
        <h2 className="text-xl font-bold mt-6 mb-2">Monthly</h2>
        <p>Check HVAC filters, test GFCI outlets, and monitor for leaks under sinks.</p>
      </div>
    </main>
  )
}
