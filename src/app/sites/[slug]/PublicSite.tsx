'use client'
import { useState } from 'react'
import { Facebook, Instagram, Linkedin, Twitter, MapPin, Phone, Mail, Clock } from 'lucide-react'

const THEMES = [
  { id: 'navy',     primary: '#0f1d35', accent: '#14b8a6' },
  { id: 'teal',     primary: '#0d9488', accent: '#f97316' },
  { id: 'orange',   primary: '#ea580c', accent: '#1e293b' },
  { id: 'slate',    primary: '#334155', accent: '#14b8a6' },
  { id: 'forest',   primary: '#166534', accent: '#eab308' },
  { id: 'crimson',  primary: '#9f1239', accent: '#fbbf24' },
  { id: 'indigo',   primary: '#3730a3', accent: '#f472b6' },
  { id: 'charcoal', primary: '#1f2937', accent: '#f97316' },
] as const

const FONTS: Record<string, { stack: string; google: string }> = {
  inter:        { stack: "'Inter', system-ui, sans-serif",      google: 'Inter:wght@400;500;600;700;800' },
  manrope:      { stack: "'Manrope', 'Inter', sans-serif",      google: 'Manrope:wght@400;500;600;700;800' },
  playfair:     { stack: "'Playfair Display', Georgia, serif",  google: 'Playfair+Display:wght@400;600;700;800' },
  merriweather: { stack: "'Merriweather', Georgia, serif",      google: 'Merriweather:wght@400;700;900' },
  oswald:       { stack: "'Oswald', 'Arial Black', sans-serif", google: 'Oswald:wght@400;500;600;700' },
  'roboto-slab':{ stack: "'Roboto Slab', Georgia, serif",       google: 'Roboto+Slab:wght@400;500;700;800' },
}

const DAY_LABELS = [
  { id: 'mon', label: 'Monday' },
  { id: 'tue', label: 'Tuesday' },
  { id: 'wed', label: 'Wednesday' },
  { id: 'thu', label: 'Thursday' },
  { id: 'fri', label: 'Friday' },
  { id: 'sat', label: 'Saturday' },
  { id: 'sun', label: 'Sunday' },
]

interface GalleryImage { url: string; caption?: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Site = Record<string, any>

export default function PublicSite({ slug, initialSite }: { slug: string; initialSite: Site | null }) {
  if (!initialSite) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-4xl mb-4">🏗️</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Site not found</h1>
        <p className="text-gray-500">This site doesn&apos;t exist or hasn&apos;t been published yet.</p>
      </div>
    )
  }

  const site = initialSite
  const theme = THEMES.find(t => t.id === site.theme) || THEMES[0]
  const font = FONTS[site.font_family as string] || FONTS.inter
  const content = site.content || {}
  const sections: string[] = site.sections || []
  const gallery: GalleryImage[] = site.gallery_images || []
  const hours: Record<string, { open?: string; close?: string; closed?: boolean }> = site.business_hours || {}
  const hasAnyHours = DAY_LABELS.some(d => hours[d.id])

  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: font.stack }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=${font.google}&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        a { text-decoration: none; }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* Sticky Nav */}
      <nav style={{ backgroundColor: theme.primary }} className="sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <a href="#hero" className="flex items-center gap-2 min-w-0">
            {site.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={site.logo_url} alt="" className="h-9 w-9 object-contain rounded-md bg-white/10 p-1" />
            )}
            <span className="font-bold text-white text-lg truncate">{site.business_name}</span>
          </a>
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

      {sections.map(sec => {
        if (sec === 'hero' && content.hero) {
          return (
            <section key={sec} id="hero" style={{ backgroundColor: theme.primary }}>
              <div className="max-w-3xl mx-auto px-6 py-24 text-center text-white">
                {(site.licensed || site.insured || site.years_experience) && (
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                    {site.licensed && <Badge>✓ Licensed</Badge>}
                    {site.insured && <Badge>✓ Insured</Badge>}
                    {site.years_experience && <Badge>{site.years_experience} Experience</Badge>}
                  </div>
                )}
                <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-5">{content.hero.headline}</h1>
                <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">{content.hero.subheadline}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a href="#contact" style={{ backgroundColor: theme.accent }}
                    className="px-6 py-3.5 rounded-xl text-white font-bold text-sm shadow-lg">
                    {content.hero.cta_primary || 'Get a Free Quote'}
                  </a>
                  {site.phone && (
                    <a href={`tel:${site.phone}`}
                      className="px-6 py-3.5 rounded-xl text-white font-semibold text-sm border border-white/30 hover:bg-white/10 transition">
                      {content.hero.cta_secondary || `Call ${site.phone}`}
                    </a>
                  )}
                </div>
              </div>
            </section>
          )
        }
        if (sec === 'services' && Array.isArray(content.services)) {
          return (
            <section key={sec} id="services" className="py-20 px-6">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold" style={{ color: theme.primary }}>Our Services</h2>
                  {site.service_areas && <p className="text-gray-500 mt-2">Serving {site.service_areas}</p>}
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
          )
        }
        if (sec === 'about' && content.about) {
          return (
            <section key={sec} id="about" className="py-20 px-6" style={{ backgroundColor: '#f8fafc' }}>
              <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold mb-5" style={{ color: theme.primary }}>{content.about.headline}</h2>
                <p className="text-gray-600 text-lg leading-relaxed mb-8">{content.about.body}</p>
                <div className="flex flex-wrap gap-5">
                  {site.licensed && <Check accent={theme.accent}>Licensed</Check>}
                  {site.insured && <Check accent={theme.accent}>Insured</Check>}
                  {site.years_experience && <Check accent={theme.accent}>{site.years_experience} in business</Check>}
                </div>
              </div>
            </section>
          )
        }
        if (sec === 'gallery' && content.gallery) {
          return (
            <section key={sec} id="gallery" className="py-20 px-6">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold" style={{ color: theme.primary }}>{content.gallery.headline}</h2>
                  <p className="text-gray-500 mt-2">{content.gallery.subheadline}</p>
                </div>
                {gallery.length === 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center">
                        <span className="text-4xl">🏠</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Gallery images={gallery} />
                )}
              </div>
            </section>
          )
        }
        if (sec === 'reviews' && Array.isArray(content.reviews)) {
          return (
            <section key={sec} id="reviews" className="py-20 px-6" style={{ backgroundColor: '#f8fafc' }}>
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-10" style={{ color: theme.primary }}>What Our Customers Say</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {content.reviews.map((r: Record<string, string | number>, i: number) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                      <div className="flex gap-0.5 mb-3 text-lg">
                        {'★★★★★'.split('').map((s, j) => <span key={j} style={{ color: theme.accent }}>{s}</span>)}
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed mb-4 italic">&ldquo;{r.text}&rdquo;</p>
                      <div>
                        <p className="font-semibold text-gray-900">{r.name}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{r.location}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )
        }
        if (sec === 'contact' && content.contact) {
          return (
            <section key={sec} id="contact" className="py-20 px-6 text-white" style={{ backgroundColor: theme.primary }}>
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold mb-3">{content.contact.headline}</h2>
                  <p className="text-white/70">{content.contact.body}</p>
                </div>

                <div className="grid md:grid-cols-5 gap-8">
                  <div className="md:col-span-3">
                    <ContactForm slug={slug} services={site.services || []} accentColor={theme.accent} />
                  </div>

                  <aside className="md:col-span-2 space-y-5 text-sm">
                    {site.phone && (
                      <ContactRow icon={<Phone size={14} />} href={`tel:${site.phone}`}>{site.phone}</ContactRow>
                    )}
                    {site.email && (
                      <ContactRow icon={<Mail size={14} />} href={`mailto:${site.email}`}>{site.email}</ContactRow>
                    )}
                    {site.service_areas && (
                      <ContactRow icon={<MapPin size={14} />}>{site.service_areas}</ContactRow>
                    )}

                    {hasAnyHours && (
                      <div>
                        <div className="flex items-center gap-2 text-white/80 mb-3">
                          <Clock size={14} /> <span className="font-semibold">Business Hours</span>
                        </div>
                        <table className="w-full text-xs">
                          <tbody>
                            {DAY_LABELS.map(d => {
                              const h = hours[d.id]
                              if (!h) return null
                              return (
                                <tr key={d.id}>
                                  <td className="py-1 text-white/60 pr-3">{d.label}</td>
                                  <td className="py-1 text-white text-right">
                                    {h.closed ? 'Closed' : `${h.open || '—'} – ${h.close || '—'}`}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <SocialLinks site={site} />
                  </aside>
                </div>
              </div>
            </section>
          )
        }
        return null
      })}

      {/* Footer */}
      <footer style={{ backgroundColor: '#0a0f1a' }} className="py-6 px-6 text-center text-white/30 text-xs">
        © {new Date().getFullYear()} {site.business_name}. Powered by{' '}
        <a href="https://useezly.com" className="text-white/50 hover:text-white transition">Prolink by EZLY</a>
      </footer>
    </div>
  )
}

/* ── helpers ───────────────────────────────────────────────────────────── */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs px-3 py-1 rounded-full font-semibold text-white"
      style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>{children}</span>
  )
}

function Check({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: accent }}>✓</span>
      <span className="font-semibold text-gray-700">{children}</span>
    </div>
  )
}

function ContactRow({ icon, href, children }: { icon: React.ReactNode; href?: string; children: React.ReactNode }) {
  const inner = (
    <div className="flex items-center gap-3 text-white/85">
      <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  )
  return href ? <a href={href} className="hover:text-white transition block">{inner}</a> : inner
}

function SocialLinks({ site }: { site: Site }) {
  const links: Array<[string, React.ReactNode]> = []
  if (site.social_facebook)  links.push([site.social_facebook,  <Facebook size={14} key="fb" />])
  if (site.social_instagram) links.push([site.social_instagram, <Instagram size={14} key="ig" />])
  if (site.social_x)         links.push([site.social_x,         <Twitter size={14} key="x" />])
  if (site.social_linkedin)  links.push([site.social_linkedin,  <Linkedin size={14} key="li" />])
  if (links.length === 0 && !site.social_google) return null
  return (
    <div>
      <p className="text-white/60 text-xs uppercase tracking-wider mb-3 font-semibold">Follow Us</p>
      <div className="flex gap-2 flex-wrap">
        {links.map(([href, icon], i) => (
          <a key={i} href={href as string} target="_blank" rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition flex items-center justify-center text-white">
            {icon}
          </a>
        ))}
        {site.social_google && (
          <a href={site.social_google} target="_blank" rel="noopener noreferrer"
            className="px-3 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition flex items-center text-white text-xs font-semibold">
            ⭐ Google
          </a>
        )}
      </div>
    </div>
  )
}

function Gallery({ images }: { images: GalleryImage[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img, i) => (
          <button key={i} onClick={() => setLightbox(i)}
            className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.caption || ''}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            {img.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-left">
                <span className="text-white text-xs font-medium">{img.caption}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {lightbox !== null && (
        <div onClick={() => setLightbox(null)}
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 cursor-pointer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[lightbox].url} alt={images[lightbox].caption || ''}
            className="max-w-full max-h-full object-contain" />
          {images[lightbox].caption && (
            <div className="absolute bottom-6 left-0 right-0 text-center text-white text-sm">
              {images[lightbox].caption}
            </div>
          )}
          <button className="absolute top-6 right-6 text-white text-3xl">×</button>
        </div>
      )}
    </>
  )
}

/* ── Contact form (posts to /api/website-leads) ───────────────────────── */

function ContactForm({ slug, services, accentColor }: { slug: string; services: string[]; accentColor: string }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', message: '',
    service_interest: '', preferred_contact: '',
    preferred_time: '', budget_range: '',
    project_address: '', project_city: '', project_zip: '',
    website: '', // honeypot
  })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const res = await fetch('/api/website-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to send')
      setSent(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send'
      setError(msg)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <p className="text-4xl mb-3">✅</p>
        <p className="font-bold text-white text-lg">Thanks! Your message is on its way.</p>
        <p className="text-white/60 text-sm mt-2">We&apos;ll be in touch shortly — usually within 1 business day.</p>
      </div>
    )
  }

  const ip = "w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm focus:outline-none focus:bg-white/15 focus:border-white/40 transition"

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-left bg-white/5 border border-white/10 rounded-2xl p-5">
      {/* honeypot */}
      <input type="text" tabIndex={-1} autoComplete="off"
        value={form.website} onChange={update('website')}
        className="hidden" aria-hidden="true" name="website" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input required placeholder="Your name *" value={form.name} onChange={update('name')} className={ip} />
        <input type="tel" placeholder="Phone" value={form.phone} onChange={update('phone')} className={ip} />
      </div>
      <input type="email" placeholder="Email *" value={form.email} onChange={update('email')} className={ip} required={!form.phone} />

      {services.length > 0 && (
        <select value={form.service_interest} onChange={update('service_interest')} className={ip}>
          <option value="" className="text-gray-900">What service are you interested in?</option>
          {services.map(s => <option key={s} value={s} className="text-gray-900">{s}</option>)}
          <option value="Other" className="text-gray-900">Other</option>
        </select>
      )}

      <textarea required rows={4} placeholder="Tell us about your project... *"
        value={form.message} onChange={update('message')}
        className={`${ip} resize-none`} />

      <details className="text-white/70 text-xs">
        <summary className="cursor-pointer hover:text-white transition select-none">+ More details (optional)</summary>
        <div className="space-y-3 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={form.preferred_contact} onChange={update('preferred_contact')} className={ip}>
              <option value="" className="text-gray-900">Preferred contact method</option>
              <option value="email" className="text-gray-900">Email</option>
              <option value="phone" className="text-gray-900">Phone call</option>
              <option value="text" className="text-gray-900">Text message</option>
            </select>
            <input placeholder="Best time to reach you" value={form.preferred_time} onChange={update('preferred_time')} className={ip} />
          </div>
          <select value={form.budget_range} onChange={update('budget_range')} className={ip}>
            <option value="" className="text-gray-900">Budget range</option>
            <option value="<$1k" className="text-gray-900">Under $1,000</option>
            <option value="$1k-5k" className="text-gray-900">$1,000 – $5,000</option>
            <option value="$5k-15k" className="text-gray-900">$5,000 – $15,000</option>
            <option value="$15k-50k" className="text-gray-900">$15,000 – $50,000</option>
            <option value="$50k+" className="text-gray-900">$50,000+</option>
            <option value="not-sure" className="text-gray-900">Not sure yet</option>
          </select>
          <input placeholder="Project address" value={form.project_address} onChange={update('project_address')} className={ip} />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="City" value={form.project_city} onChange={update('project_city')} className={ip} />
            <input placeholder="ZIP" value={form.project_zip} onChange={update('project_zip')} className={ip} />
          </div>
        </div>
      </details>

      {error && (
        <div className="px-3 py-2 bg-red-500/20 border border-red-400/30 rounded-lg text-red-100 text-xs">{error}</div>
      )}

      <button type="submit" disabled={sending} style={{ backgroundColor: accentColor }}
        className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-70 transition">
        {sending ? 'Sending...' : 'Send Message'}
      </button>
      <p className="text-[10px] text-white/40 text-center">By submitting, you agree to be contacted about your inquiry.</p>
    </form>
  )
}
