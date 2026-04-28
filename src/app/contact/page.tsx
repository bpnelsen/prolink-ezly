'use client'

export default function ContactPage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-black text-[#0f3a7d] mb-6 text-center">Contact</h1>
      <iframe src="/contact-form.html" title="Contact Form" style={{ width: '100%', height: '350px', border: 0 }} />
    </div>
  )
}
