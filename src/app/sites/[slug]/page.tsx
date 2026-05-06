'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase-client'

const THEMES = [
  { id: 'navy', primary: '#0f1d35', accent: '#14b8a6' },
  { id: 'teal', primary: '#0d9488', accent: '#f97316' },
  { id: 'orange', primary: '#ea580c', accent: '#1e293b' },
  { id: 'slate', primary: '#334155', accent: '#14b8a6' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Site = Record<string, any>

export default function PublicSitePage({ params }: { params: { slug: string } }) {
  const [site, setSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('contractor_websites')
        .select('*')
        .eq('slug', params.slug)
        .eq('published', true)
        .single()
      setSite(data)
      setLoading(false)
    }
    load()
  }, [params.slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!site) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-4xl mb-4">🏗️</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Site not found</h1>
        <p className="text-gray-500">This site doesn't exist or hasn't been published yet.</p>
      </div>
    )
  }

  const theme = THEMES.find(t => t.id === site.theme) || THEMES[0]
  const content = site.content || {}
  const sections: string[] = site.sections || []

  return (
    <div className="font-sans bg-white min-h-screen" style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        a { text-decoration: none; }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* Sticky Nav */}
      <nav style={{ backgroundColor: theme.primary }} className="sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-white text-lg">{site.business_name}</span>
          <div className="hidden sm:flex gap-6 text-sm">
            {sections.filter(s => s !== 'hero').map(s => (
              <a key={s} href={`#${s}`} style={{ color: 'rgba(255,255,255,0.75)' }}
                className="hover:text-white transition capitalize font-medium">
                {s === 'reviews' ? 'Testimonials' : s}
              </a>
            ))}
          </div>
          {site.phone && (
            <a href={`tel:${site.phone}`} style={{ backgroundColor: theme.accent }}
              className="hidden sm:block px-4 py-2 rounded-lg text-white text-sm font-bold">
              {site.phone}
            </a>
          )}
        </div>
      </nav>

      {/* Hero */}
      {sections.includes('hero') && content.hero && (
        <section id="hero" style={{ backgroundColor: theme.primary }}>
          <div className="max-w-3xl mx-auto px-6 py-24 text-center text-white">
            {(site.licensed || site.insured || site.years_experience) && (
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                {site.licensed && (
                  <span className="text-xs px-3 py-1 rounded-full font-semibold text-white" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                    ✓ Licensed
                  </span>
                )}
                {site.insured && (
                  <span className="text-xs px-3 py-1 rounded-full font-semibold text-white" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                    ✓ Insured
                  </span>
                )}
                {site.years_experience && (
                  <span className="text-xs px-3 py-1 rounded-full font-semibold text-white" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                    {site.years_experience} Experience
                  </span>
                )}
              </div>
            )}
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-5">
              {content.hero.headline}
            </h1>
            <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
              {content.hero.subheadline}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="#contact" style={{ backgroundColor: theme.accent }}
                className="px-6 py-3.5 rounded-xl text-white font-bold text-sm shadow-lg">
                {content.hero.cta_primary || 'Get a Free Quote'}
              </a>
              <a href={`tel:${site.phone}`}
                className="px-6 py-3.5 rounded-xl text-white font-semibold text-sm border border-white/30 hover:bg-white/10 transition">
                {content.hero.cta_secondary || `Call ${site.phone}`}
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Services */}
      {sections.includes('services') && Array.isArray(content.services) && (
        <section id="services" className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold" style={{ color: theme.primary }}>Our Services</h2>
              {site.service_areas && (
                <p className="text-gray-500 mt-2">Serving {site.service_areas}</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {content.services.map((svc: Record<string, string>, i: number) => (
                <div key={i} className="border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                  <div className="text-3xl mb-3">{svc.icon}</div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{svc.name}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{svc.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About */}
      {sections.includes('about') && content.about && (
        <section id="about" className="py-20 px-6" style={{ backgroundColor: '#f8fafc' }}>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-5" style={{ color: theme.primary }}>
              {content.about.headline}
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">{content.about.body}</p>
            <div className="flex flex-wrap gap-5">
              {site.licensed && (
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: theme.accent }}>✓</span>
                  <span className="font-semibold text-gray-700">Licensed</span>
                </div>
              )}
              {site.insured && (
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: theme.accent }}>✓</span>
                  <span className="font-semibold text-gray-700">Insured</span>
                </div>
              )}
              {site.years_experience && (
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: theme.accent }}>✓</span>
                  <span className="font-semibold text-gray-700">{site.years_experience} in business</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {sections.includes('gallery') && content.gallery && (
        <section id="gallery" className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold" style={{ color: theme.primary }}>{content.gallery.headline}</h2>
              <p className="text-gray-500 mt-2">{content.gallery.subheadline}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition">
                  <span className="text-4xl">🏠</span>
                </div>
              ))}
            </div>
            <p className="text-center text-gray-400 text-sm mt-4">Photo upload coming soon</p>
          </div>
        </section>
      )}

      {/* Reviews */}
      {sections.includes('reviews') && Array.isArray(content.reviews) && (
        <section id="reviews" className="py-20 px-6" style={{ backgroundColor: '#f8fafc' }}>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-10" style={{ color: theme.primary }}>
              What Our Customers Say
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {content.reviews.map((r: Record<string, string | number>, i: number) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <div className="flex gap-0.5 mb-3 text-lg">
                    {'★★★★★'.split('').map((s, j) => (
                      <span key={j} style={{ color: theme.accent }}>{s}</span>
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 italic">"{r.text}"</p>
                  <div>
                    <p className="font-semibold text-gray-900">{r.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{r.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      {sections.includes('contact') && content.contact && (
        <section id="contact" className="py-20 px-6 text-white" style={{ backgroundColor: theme.primary }}>
          <div className="max-w-lg mx-auto text-center">
            <h2 className="text-3xl font-bold mb-3">{content.contact.headline}</h2>
            <p className="text-white/70 mb-8">{content.contact.body}</p>
            <ContactForm accentColor={theme.accent} businessEmail={site.email} />
            <div className="mt-8 pt-8 border-t border-white/20 flex flex-col sm:flex-row justify-center gap-4 text-white/70 text-sm">
              {site.phone && <a href={`tel:${site.phone}`} className="hover:text-white transition">📞 {site.phone}</a>}
              {site.email && <a href={`mailto:${site.email}`} className="hover:text-white transition">✉️ {site.email}</a>}
              {site.service_areas && <span>📍 {site.service_areas}</span>}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{ backgroundColor: '#0a0f1a' }} className="py-6 px-6 text-center text-white/30 text-xs">
        © {new Date().getFullYear()} {site.business_name}. Powered by{' '}
        <a href="https://useezly.com" className="text-white/50 hover:text-white transition">Prolink by EZLY</a>
      </footer>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ContactForm({ accentColor, businessEmail: _businessEmail }: { accentColor: string, businessEmail: string }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    await new Promise(r => setTimeout(r, 1000))
    setSent(true)
    setSending(false)
  }

  if (sent) {
    return (
      <div className="py-8">
        <p className="text-3xl mb-3">✅</p>
        <p className="font-bold text-white text-lg">Message sent!</p>
        <p className="text-white/60 text-sm mt-1">We'll be in touch shortly.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-left">
      <div className="grid grid-cols-2 gap-3">
        <input required placeholder="Your Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:bg-white/15 focus:border-white/40 transition" />
        <input placeholder="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
          className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:bg-white/15 focus:border-white/40 transition" />
      </div>
      <input type="email" required placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:bg-white/15 focus:border-white/40 transition" />
      <textarea required rows={4} placeholder="Describe your project..." value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:bg-white/15 focus:border-white/40 transition resize-none" />
      <button type="submit" disabled={sending} style={{ backgroundColor: accentColor }}
        className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-70 transition">
        {sending ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}
