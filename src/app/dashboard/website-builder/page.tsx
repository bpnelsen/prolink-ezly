'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase-client'
import {
  Globe, Sparkles, Check, ChevronRight, ExternalLink, Copy, RefreshCw,
  Monitor, Smartphone, ArrowUp, ArrowDown, Trash2, Plus, Image as ImageIcon,
  Upload, Inbox, X, Search,
} from 'lucide-react'

/* ── Static config ─────────────────────────────────────────────────────── */

const SECTION_OPTIONS = [
  { id: 'hero', label: 'Hero / Banner', desc: 'Top section with headline & call-to-action' },
  { id: 'services', label: 'Services', desc: 'Showcase what you offer' },
  { id: 'about', label: 'About Us', desc: 'Your story and credentials' },
  { id: 'gallery', label: 'Photo Gallery', desc: 'Photo grid of your past work' },
  { id: 'reviews', label: 'Testimonials', desc: 'AI-generated sample reviews' },
  { id: 'contact', label: 'Contact', desc: 'Contact form and your info' },
]

const THEMES = [
  { id: 'navy',     label: 'Navy',     primary: '#0f1d35', accent: '#14b8a6' },
  { id: 'teal',     label: 'Teal',     primary: '#0d9488', accent: '#f97316' },
  { id: 'orange',   label: 'Orange',   primary: '#ea580c', accent: '#1e293b' },
  { id: 'slate',    label: 'Slate',    primary: '#334155', accent: '#14b8a6' },
  { id: 'forest',   label: 'Forest',   primary: '#166534', accent: '#eab308' },
  { id: 'crimson',  label: 'Crimson',  primary: '#9f1239', accent: '#fbbf24' },
  { id: 'indigo',   label: 'Indigo',   primary: '#3730a3', accent: '#f472b6' },
  { id: 'charcoal', label: 'Charcoal', primary: '#1f2937', accent: '#f97316' },
] as const

type Theme = typeof THEMES[number]

const FONTS = [
  { id: 'inter',     label: 'Inter (modern, default)',  stack: "'Inter', system-ui, sans-serif" },
  { id: 'manrope',   label: 'Manrope (friendly)',        stack: "'Manrope', 'Inter', sans-serif" },
  { id: 'playfair',  label: 'Playfair Display (luxury)', stack: "'Playfair Display', Georgia, serif" },
  { id: 'merriweather', label: 'Merriweather (classic)', stack: "'Merriweather', Georgia, serif" },
  { id: 'oswald',    label: 'Oswald (bold/industrial)',  stack: "'Oswald', 'Arial Black', sans-serif" },
  { id: 'roboto-slab', label: 'Roboto Slab (sturdy)',    stack: "'Roboto Slab', Georgia, serif" },
] as const

type FontId = typeof FONTS[number]['id']

const DAYS = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
]

/* ── Types ─────────────────────────────────────────────────────────────── */

interface GalleryImage { url: string; path?: string; caption?: string }
interface BusinessHour  { open?: string; close?: string; closed?: boolean }

interface Questionnaire {
  business_name: string
  owner_name: string
  tagline: string
  about_story: string
  services: string[]
  service_areas: string
  phone: string
  email: string
  years_experience: string
  licensed: boolean
  insured: boolean
  sections: string[]
  theme: string
  font_family: FontId
  slug: string
  custom_domain: string
  logo_url: string
  gallery_images: GalleryImage[]
  business_hours: Record<string, BusinessHour>
  seo_title: string
  seo_description: string
  social_image_url: string
  social_facebook: string
  social_instagram: string
  social_x: string
  social_linkedin: string
  social_google: string
  lead_notify_email: string
}

type Step = 'questionnaire' | 'generating' | 'editing' | 'published'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Content = Record<string, any>

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const emptyHours: Record<string, BusinessHour> = {
  mon: { open: '08:00', close: '17:00' },
  tue: { open: '08:00', close: '17:00' },
  wed: { open: '08:00', close: '17:00' },
  thu: { open: '08:00', close: '17:00' },
  fri: { open: '08:00', close: '17:00' },
  sat: { closed: true },
  sun: { closed: true },
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function WebsiteBuilderPage() {
  const [step, setStep] = useState<Step>('questionnaire')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'preview' | 'edit' | 'design' | 'seo'>('preview')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [regenSection, setRegenSection] = useState<string | null>(null)
  const [existingSiteId, setExistingSiteId] = useState<string | null>(null)
  const [content, setContent] = useState<Content>({})

  const [q, setQ] = useState<Questionnaire>({
    business_name: '', owner_name: '', tagline: '', about_story: '',
    services: [], service_areas: '', phone: '', email: '',
    years_experience: '', licensed: false, insured: false,
    sections: ['hero', 'services', 'about', 'gallery', 'reviews', 'contact'],
    theme: 'navy', font_family: 'inter', slug: '', custom_domain: '',
    logo_url: '', gallery_images: [], business_hours: emptyHours,
    seo_title: '', seo_description: '', social_image_url: '',
    social_facebook: '', social_instagram: '', social_x: '',
    social_linkedin: '', social_google: '', lead_notify_email: '',
  })

  /* Load existing site (if any) */
  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const uid = session.user.id
      const meta = session.user.user_metadata ?? {}

      const [{ data: profile }, { data: site }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('contractor_websites').select('*').eq('contractor_id', uid).single(),
      ])

      const bName = profile?.business_name || meta.business_name || ''
      const oName = profile?.full_name || meta.full_name || ''
      const phone = profile?.phone || meta.phone || ''

      if (site) {
        setExistingSiteId(site.id)
        setQ({
          business_name: site.business_name || bName,
          owner_name: site.owner_name || oName,
          tagline: site.tagline || '',
          about_story: site.about_story || '',
          services: site.services || [],
          service_areas: site.service_areas || '',
          phone: site.phone || phone,
          email: site.email || session.user.email || '',
          years_experience: site.years_experience || '',
          licensed: site.licensed ?? false,
          insured: site.insured ?? false,
          sections: site.sections || ['hero', 'services', 'about', 'gallery', 'reviews', 'contact'],
          theme: site.theme || 'navy',
          font_family: site.font_family || 'inter',
          slug: site.slug || slugify(bName),
          custom_domain: site.custom_domain || '',
          logo_url: site.logo_url || '',
          gallery_images: site.gallery_images || [],
          business_hours: site.business_hours && Object.keys(site.business_hours).length ? site.business_hours : emptyHours,
          seo_title: site.seo_title || '',
          seo_description: site.seo_description || '',
          social_image_url: site.social_image_url || '',
          social_facebook: site.social_facebook || '',
          social_instagram: site.social_instagram || '',
          social_x: site.social_x || '',
          social_linkedin: site.social_linkedin || '',
          social_google: site.social_google || '',
          lead_notify_email: site.lead_notify_email || session.user.email || '',
        })
        if (site.content && Object.keys(site.content).length > 0) {
          setContent(site.content)
          setStep(site.published ? 'published' : 'editing')
        }
      } else {
        setQ(prev => ({
          ...prev,
          business_name: bName,
          owner_name: oName,
          phone,
          email: session.user.email || '',
          lead_notify_email: session.user.email || '',
          slug: slugify(bName),
        }))
      }

      setLoading(false)
    }
    loadProfile()
  }, [])

  /* ── Helpers ──────────────────────────────────────────────────────── */

  const toggleSection = (id: string) => {
    setQ(prev => ({
      ...prev,
      sections: prev.sections.includes(id)
        ? prev.sections.filter(s => s !== id)
        : [...prev.sections, id],
    }))
  }

  const moveSection = (id: string, dir: -1 | 1) => {
    setQ(prev => {
      const i = prev.sections.indexOf(id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.sections.length) return prev
      const next = [...prev.sections]
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...prev, sections: next }
    })
  }

  const handleServiceInput = (val: string) => {
    const services = val.split(',').map(s => s.trim()).filter(Boolean)
    setQ(prev => ({ ...prev, services }))
  }

  const setHour = (day: string, patch: Partial<BusinessHour>) => {
    setQ(prev => ({
      ...prev,
      business_hours: { ...prev.business_hours, [day]: { ...prev.business_hours[day], ...patch } },
    }))
  }

  const generate = async (only?: string) => {
    if (!q.business_name) { setError('Business name is required'); return }
    if (q.sections.length === 0) { setError('Select at least one section'); return }
    setError('')

    if (only) {
      setRegenSection(only)
    } else {
      setStep('generating')
    }

    try {
      const res = await fetch('/api/generate-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionnaire: q, section: only }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed')

      if (only) {
        setContent(prev => ({ ...prev, ...data.content }))
      } else {
        setContent(data.content)
        setStep('editing')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Generation failed'
      setError(msg)
      if (!only) setStep('questionnaire')
    } finally {
      setRegenSection(null)
    }
  }

  const save = async (publish: boolean) => {
    setSaving(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')

      const payload = {
        contractor_id: session.user.id,
        ...q,
        content,
        published: publish,
        updated_at: new Date().toISOString(),
      }

      let err
      if (existingSiteId) {
        ;({ error: err } = await supabase.from('contractor_websites').update(payload).eq('id', existingSiteId))
      } else {
        const { data, error: insertErr } = await supabase.from('contractor_websites').insert(payload).select().single()
        err = insertErr
        if (data) setExistingSiteId(data.id)
      }

      if (err) throw err
      if (publish) setStep('published')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const uploadAsset = async (file: File, kind: 'logo' | 'gallery'): Promise<{ url: string; path: string } | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Not logged in'); return null }
    const form = new FormData()
    form.append('file', file)
    form.append('kind', kind)
    const res = await fetch('/api/website-uploads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: form,
    })
    const data = await res.json()
    if (!res.ok) { setError(data.message || 'Upload failed'); return null }
    return data
  }

  const deleteAsset = async (path: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/website-uploads', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ path }),
    })
  }

  const onLogoSelected = async (file: File) => {
    const r = await uploadAsset(file, 'logo')
    if (r) setQ(prev => ({ ...prev, logo_url: r.url }))
  }

  const onGallerySelected = async (files: FileList) => {
    const uploads = await Promise.all(Array.from(files).map(f => uploadAsset(f, 'gallery')))
    const added = uploads.filter(Boolean).map(r => ({ url: r!.url, path: r!.path, caption: '' }))
    if (added.length) {
      setQ(prev => ({ ...prev, gallery_images: [...prev.gallery_images, ...added] }))
    }
  }

  const removeGalleryImage = (idx: number) => {
    const img = q.gallery_images[idx]
    if (img?.path) deleteAsset(img.path)
    setQ(prev => ({ ...prev, gallery_images: prev.gallery_images.filter((_, i) => i !== idx) }))
  }

  const moveGalleryImage = (idx: number, dir: -1 | 1) => {
    setQ(prev => {
      const next = [...prev.gallery_images]
      const j = idx + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return { ...prev, gallery_images: next }
    })
  }

  const theme: Theme = THEMES.find(t => t.id === q.theme) || THEMES[0]
  const font = FONTS.find(f => f.id === q.font_family) || FONTS[0]
  const siteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/sites/${q.slug}`

  const copyUrl = () => {
    navigator.clipboard.writeText(siteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-14 md:pt-8">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <Globe size={18} className="text-teal-600" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Website Builder</h1>
          </div>
          <p className="text-gray-500 text-sm">AI-powered websites for your contracting business — live in minutes.</p>
        </div>
        <Link href="/dashboard/website-builder/leads"
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition shrink-0">
          <Inbox size={14} /> Leads Inbox
        </Link>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1 sm:gap-2 mb-6 md:mb-8 overflow-x-auto -mx-1 px-1 pb-1">
        {(['questionnaire', 'generating', 'editing', 'published'] as Step[]).map((s, i) => {
          const labels = ['Setup', 'Generating', 'Review & Edit', 'Published']
          const done = ['questionnaire', 'generating', 'editing', 'published'].indexOf(step) > i
          const active = step === s
          return (
            <div key={s} className="flex items-center gap-1 sm:gap-2 shrink-0">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                done ? 'bg-teal-100 text-teal-700' : active ? 'bg-[#0f1d35] text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {done ? <Check size={11} /> : <span>{i + 1}</span>}
                {labels[i]}
              </div>
              {i < 3 && <ChevronRight size={14} className="text-gray-300 shrink-0" />}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700"><X size={14} /></button>
        </div>
      )}

      {/* ── QUESTIONNAIRE ─────────────────────────────────────────────── */}
      {step === 'questionnaire' && (
        <div className="space-y-6">
          {/* Business Basics */}
          <Card title="About Your Business" sub="Pre-filled from your profile — update anything that's changed.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Business Name *" value={q.business_name}
                onChange={v => setQ(p => ({ ...p, business_name: v, slug: slugify(v) }))} />
              <Input label="Owner Name" value={q.owner_name} onChange={v => setQ(p => ({ ...p, owner_name: v }))} />
              <Input full label="Your Tagline" value={q.tagline} placeholder="e.g. Quality Work, On Time, Every Time"
                onChange={v => setQ(p => ({ ...p, tagline: v }))} />
              <Textarea full label="Your Story" rows={3} value={q.about_story}
                placeholder="Tell us a bit about your business — why you started, what you stand for, what makes you different..."
                onChange={v => setQ(p => ({ ...p, about_story: v }))} />
            </div>
          </Card>

          {/* Logo */}
          <Card title="Logo" sub="Optional — appears in the site header and contact section.">
            <LogoUploader logoUrl={q.logo_url} onUpload={onLogoSelected}
              onClear={() => setQ(p => ({ ...p, logo_url: '' }))} />
          </Card>

          {/* Services & Contact */}
          <Card title="Services & Contact" sub="How customers find and reach you.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input full label="Services (comma-separated)" value={q.services.join(', ')}
                  placeholder="Kitchen Remodeling, Bathroom Renovation, Roofing..."
                  onChange={handleServiceInput} />
                {q.services.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {q.services.map(s => (
                      <span key={s} className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                )}
              </div>
              <Input label="Service Areas" value={q.service_areas} placeholder="Salt Lake City, West Valley..."
                onChange={v => setQ(p => ({ ...p, service_areas: v }))} />
              <Input label="Phone" value={q.phone} onChange={v => setQ(p => ({ ...p, phone: v }))} />
              <Input full label="Public Contact Email" type="email" value={q.email}
                onChange={v => setQ(p => ({ ...p, email: v }))} />
              <Input full label="Lead notifications email"
                hint="Where we send new lead emails. Defaults to your account email."
                type="email" value={q.lead_notify_email}
                onChange={v => setQ(p => ({ ...p, lead_notify_email: v }))} />
            </div>
          </Card>

          {/* Business Hours */}
          <Card title="Business Hours" sub="Shown on the contact section. Toggle days you're closed.">
            <div className="space-y-2">
              {DAYS.map(d => {
                const h = q.business_hours[d.id] || {}
                return (
                  <div key={d.id} className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <div className="w-12 text-xs font-semibold text-gray-700">{d.label}</div>
                    <button onClick={() => setHour(d.id, { closed: !h.closed })}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition ${
                        h.closed ? 'bg-gray-200 text-gray-500' : 'bg-teal-50 text-teal-700 border border-teal-100'
                      }`}>
                      {h.closed ? 'Closed' : 'Open'}
                    </button>
                    {!h.closed && (
                      <>
                        <input type="time" value={h.open || '08:00'}
                          onChange={e => setHour(d.id, { open: e.target.value })}
                          className="px-2 py-1 border border-gray-200 rounded-lg text-xs" />
                        <span className="text-gray-400 text-xs">to</span>
                        <input type="time" value={h.close || '17:00'}
                          onChange={e => setHour(d.id, { close: e.target.value })}
                          className="px-2 py-1 border border-gray-200 rounded-lg text-xs" />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Credentials, Sections & Design */}
          <Card title="Credentials, Sections & Design" sub="Trust signals and the structure of your homepage.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Years in Business</label>
                <select value={q.years_experience} onChange={e => setQ(p => ({ ...p, years_experience: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="">Select...</option>
                  <option value="0-2">0–2 years</option>
                  <option value="3-5">3–5 years</option>
                  <option value="6-10">6–10 years</option>
                  <option value="10+">10+ years</option>
                </select>
              </div>
              <TogglePair label="Licensed?" value={q.licensed} onChange={v => setQ(p => ({ ...p, licensed: v }))} />
              <TogglePair label="Insured?"  value={q.insured}  onChange={v => setQ(p => ({ ...p, insured: v }))} />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Page Sections (drag to reorder is below in the editor)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SECTION_OPTIONS.map(s => (
                  <button key={s.id} onClick={() => toggleSection(s.id)}
                    className={`text-left p-3 rounded-xl border text-xs transition ${q.sections.includes(s.id) ? 'bg-teal-50 border-teal-400 text-teal-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {q.sections.includes(s.id) && <Check size={10} className="text-teal-600" />}
                      <span className="font-semibold">{s.label}</span>
                    </div>
                    <span className="text-gray-400 text-[10px]">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Color Theme</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {THEMES.map(t => (
                  <button key={t.id} onClick={() => setQ(p => ({ ...p, theme: t.id }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition ${q.theme === t.id ? 'border-gray-400 bg-gray-50' : 'border-gray-200 bg-white text-gray-500'}`}>
                    <div className="flex -space-x-1">
                      <div className="w-4 h-4 rounded-full border border-white/50" style={{ backgroundColor: t.primary }} />
                      <div className="w-4 h-4 rounded-full border border-white/50" style={{ backgroundColor: t.accent }} />
                    </div>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Font</label>
              <select value={q.font_family} onChange={e => setQ(p => ({ ...p, font_family: e.target.value as FontId }))}
                className="w-full sm:w-auto px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                style={{ fontFamily: FONTS.find(f => f.id === q.font_family)?.stack }}>
                {FONTS.map(f => <option key={f.id} value={f.id} style={{ fontFamily: f.stack }}>{f.label}</option>)}
              </select>
            </div>
          </Card>

          {/* SEO + Social */}
          <Card title="SEO & Social Links" sub="How your site shows up in Google and when shared on social media.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <Input full label="SEO Title (Google search)" value={q.seo_title}
                hint={`${q.seo_title.length}/60 chars — defaults to "${q.business_name || 'Business'} — ${q.service_areas || 'Local Contractor'}"`}
                placeholder="Acme Roofing — Salt Lake City"
                onChange={v => setQ(p => ({ ...p, seo_title: v.slice(0, 120) }))} />
              <Textarea full label="SEO Description (Google search snippet)" value={q.seo_description}
                hint={`${q.seo_description.length}/160 chars`}
                placeholder="Licensed roofing contractor in Salt Lake City. Free estimates, 5-star reviews, lifetime workmanship guarantee."
                onChange={v => setQ(p => ({ ...p, seo_description: v.slice(0, 240) }))} rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Facebook URL"  value={q.social_facebook}  onChange={v => setQ(p => ({ ...p, social_facebook: v }))} placeholder="https://facebook.com/yourbiz" />
              <Input label="Instagram URL" value={q.social_instagram} onChange={v => setQ(p => ({ ...p, social_instagram: v }))} placeholder="https://instagram.com/yourbiz" />
              <Input label="X / Twitter URL"   value={q.social_x}        onChange={v => setQ(p => ({ ...p, social_x: v }))} placeholder="https://x.com/yourbiz" />
              <Input label="LinkedIn URL"  value={q.social_linkedin} onChange={v => setQ(p => ({ ...p, social_linkedin: v }))} placeholder="https://linkedin.com/company/yourbiz" />
              <Input full label="Google Business Profile URL" value={q.social_google}
                placeholder="https://g.page/yourbiz"
                onChange={v => setQ(p => ({ ...p, social_google: v }))} />
            </div>
          </Card>

          {/* Site URL */}
          <Card title="Your Site URL" sub="Your website will be live at this address.">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap">
                {typeof window !== 'undefined' ? window.location.host : 'useezly.com'}/sites/
              </span>
              <input value={q.slug} onChange={e => setQ(p => ({ ...p, slug: slugify(e.target.value) }))}
                className="flex-1 px-3 py-2.5 text-sm outline-none font-mono" />
            </div>
            <div className="mt-3">
              <Input full label="Custom Domain (optional)" value={q.custom_domain} placeholder="www.yourdomain.com"
                onChange={v => setQ(p => ({ ...p, custom_domain: v }))} />
              <p className="text-[10px] text-gray-400 mt-1">Point your domain's CNAME to useezly.com after publishing.</p>
            </div>
          </Card>

          <button onClick={() => generate()} disabled={!q.business_name || q.sections.length === 0}
            className="w-full py-4 bg-[#0f1d35] hover:bg-[#0a1628] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2 text-sm">
            <Sparkles size={16} /> Generate My Website with AI
          </button>
        </div>
      )}

      {/* ── GENERATING ──────────────────────────────────────────────────── */}
      {step === 'generating' && (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-teal-500 animate-spin" />
            <Sparkles size={22} className="absolute inset-0 m-auto text-teal-500" />
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-900 text-lg">Building your website...</p>
            <p className="text-gray-400 text-sm mt-1">AI is writing professional copy for each section. This takes 10–20 seconds.</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center max-w-md">
            {q.sections.map(s => (
              <span key={s} className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-full font-medium capitalize">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── EDITING / PUBLISHED ─────────────────────────────────────────── */}
      {(step === 'editing' || step === 'published') && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${step === 'published' ? 'bg-green-500' : 'bg-yellow-400'}`} />
                <span className="text-sm font-semibold text-gray-700">
                  {step === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs text-gray-400 font-mono">{siteUrl}</span>
                {step === 'published' && (
                  <>
                    <button onClick={copyUrl} className="p-1 hover:text-teal-600 text-gray-400 transition">
                      {copied ? <Check size={12} className="text-teal-500" /> : <Copy size={12} />}
                    </button>
                    <Link href={`/sites/${q.slug}`} target="_blank" className="p-1 hover:text-teal-600 text-gray-400 transition">
                      <ExternalLink size={12} />
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setStep('questionnaire')}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
                <RefreshCw size={12} /> Edit Setup
              </button>
              <button onClick={() => save(false)} disabled={saving}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition">
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button onClick={() => save(true)} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition">
                <Globe size={12} /> {saving ? 'Publishing...' : step === 'published' ? 'Update Site' : 'Publish Site'}
              </button>
            </div>
          </div>

          {step === 'published' && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Check size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-green-800">Your website is live!</p>
                <p className="text-xs text-green-600">
                  <Link href={`/sites/${q.slug}`} target="_blank" className="underline font-medium">{siteUrl}</Link>
                  {' '}— Share this link with customers.
                </p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-100 overflow-x-auto">
              {(['preview', 'edit', 'design', 'seo'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-5 py-3 text-sm font-semibold capitalize transition whitespace-nowrap ${activeTab === t ? 'border-b-2 border-teal-500 text-teal-700' : 'text-gray-400 hover:text-gray-600'}`}>
                  {t === 'preview' ? 'Preview' : t === 'edit' ? 'Edit Content' : t === 'design' ? 'Design & Photos' : 'SEO & Social'}
                </button>
              ))}
            </div>

            {activeTab === 'preview' && (
              <div className="p-4">
                <div className="flex items-center justify-end gap-2 mb-3">
                  <button onClick={() => setPreviewDevice('desktop')}
                    className={`p-2 rounded-lg transition ${previewDevice === 'desktop' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}>
                    <Monitor size={14} />
                  </button>
                  <button onClick={() => setPreviewDevice('mobile')}
                    className={`p-2 rounded-lg transition ${previewDevice === 'mobile' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}>
                    <Smartphone size={14} />
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 mx-auto transition-all"
                  style={{ maxWidth: previewDevice === 'mobile' ? 380 : '100%' }}>
                  <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center px-3 gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    <span className="ml-3 text-[10px] text-gray-400 font-mono truncate">{siteUrl}</span>
                  </div>
                  <div className="h-[640px] overflow-y-auto">
                    <SiteRenderer content={content} q={q} theme={theme} font={font} preview />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'edit' && (
              <div className="p-6">
                <ContentEditor
                  content={content}
                  setContent={setContent}
                  sections={q.sections}
                  moveSection={moveSection}
                  regenSection={regenSection}
                  onRegenerate={s => generate(s)}
                />
              </div>
            )}

            {activeTab === 'design' && (
              <div className="p-6 space-y-6">
                <DesignPanel q={q} setQ={setQ} onLogoSelected={onLogoSelected}
                  onGallerySelected={onGallerySelected}
                  removeGalleryImage={removeGalleryImage}
                  moveGalleryImage={moveGalleryImage} />
              </div>
            )}

            {activeTab === 'seo' && (
              <div className="p-6 space-y-4">
                <SEOPanel q={q} setQ={setQ} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Reusable form bits ────────────────────────────────────────────────── */

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-bold text-gray-900 mb-1">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mb-5">{sub}</p>}
      {children}
    </div>
  )
}

function Input({ label, value, onChange, placeholder, type = 'text', hint, full }:
  { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <input type={type} value={value || ''} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function Textarea({ label, value, onChange, placeholder, rows = 3, hint, full }:
  { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; hint?: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <textarea value={value || ''} rows={rows} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none" />
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function TogglePair({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <div className="flex gap-2">
        {[true, false].map(v => (
          <button key={String(v)} onClick={() => onChange(v)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition ${value === v ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            {v ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Logo uploader ─────────────────────────────────────────────────────── */

function LogoUploader({ logoUrl, onUpload, onClear }: { logoUrl: string; onUpload: (f: File) => void | Promise<void>; onClear: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const pick = () => inputRef.current?.click()

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setBusy(true)
    await onUpload(f)
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="w-24 h-24 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
        ) : (
          <ImageIcon size={22} className="text-gray-300" />
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={pick} disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
          <Upload size={12} /> {busy ? 'Uploading...' : logoUrl ? 'Replace' : 'Upload Logo'}
        </button>
        {logoUrl && (
          <button type="button" onClick={onClear}
            className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-red-500 transition">
            Remove
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
      </div>
    </div>
  )
}

/* ── Design panel ──────────────────────────────────────────────────────── */

function DesignPanel({
  q, setQ, onLogoSelected, onGallerySelected, removeGalleryImage, moveGalleryImage,
}: {
  q: Questionnaire
  setQ: React.Dispatch<React.SetStateAction<Questionnaire>>
  onLogoSelected: (f: File) => Promise<void>
  onGallerySelected: (files: FileList) => Promise<void>
  removeGalleryImage: (i: number) => void
  moveGalleryImage: (i: number, dir: -1 | 1) => void
}) {
  const galleryRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const onChangeGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    setBusy(true)
    await onGallerySelected(e.target.files)
    setBusy(false)
    if (galleryRef.current) galleryRef.current.value = ''
  }

  return (
    <>
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3">Logo</h3>
        <LogoUploader logoUrl={q.logo_url} onUpload={onLogoSelected}
          onClear={() => setQ(p => ({ ...p, logo_url: '' }))} />
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">Color Theme</h3>
        <p className="text-xs text-gray-400 mb-3">Two-color palette applied across the whole site.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {THEMES.map(t => (
            <button key={t.id} onClick={() => setQ(p => ({ ...p, theme: t.id }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition ${q.theme === t.id ? 'border-gray-400 bg-gray-50' : 'border-gray-200 bg-white text-gray-500'}`}>
              <div className="flex -space-x-1">
                <div className="w-4 h-4 rounded-full border border-white/50" style={{ backgroundColor: t.primary }} />
                <div className="w-4 h-4 rounded-full border border-white/50" style={{ backgroundColor: t.accent }} />
              </div>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">Font</h3>
        <p className="text-xs text-gray-400 mb-3">Applied to all text on the public site.</p>
        <select value={q.font_family} onChange={e => setQ(p => ({ ...p, font_family: e.target.value as FontId }))}
          className="w-full sm:w-auto px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
          style={{ fontFamily: FONTS.find(f => f.id === q.font_family)?.stack }}>
          {FONTS.map(f => <option key={f.id} value={f.id} style={{ fontFamily: f.stack }}>{f.label}</option>)}
        </select>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">Photo Gallery</h3>
        <p className="text-xs text-gray-400 mb-3">Upload photos of completed projects. They appear in the gallery section.</p>
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={onChangeGallery} />
        <button type="button" onClick={() => galleryRef.current?.click()} disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 mb-4 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
          <Upload size={12} /> {busy ? 'Uploading...' : 'Upload Photos'}
        </button>

        {q.gallery_images.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No photos yet — uploads appear here.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {q.gallery_images.map((img, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.caption || 'Project photo'} className="aspect-square object-cover w-full" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={() => moveGalleryImage(i, -1)} className="p-1.5 bg-white rounded-lg shadow"><ArrowUp size={12} /></button>
                  <button onClick={() => moveGalleryImage(i, 1)}  className="p-1.5 bg-white rounded-lg shadow"><ArrowDown size={12} /></button>
                  <button onClick={() => removeGalleryImage(i)}    className="p-1.5 bg-red-500 text-white rounded-lg shadow"><Trash2 size={12} /></button>
                </div>
                <input
                  type="text"
                  value={img.caption || ''}
                  placeholder="Caption (optional)"
                  onChange={e => setQ(prev => {
                    const next = [...prev.gallery_images]
                    next[i] = { ...next[i], caption: e.target.value }
                    return { ...prev, gallery_images: next }
                  })}
                  className="w-full px-2 py-1.5 text-[11px] border-t border-gray-200 outline-none"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/* ── SEO panel ─────────────────────────────────────────────────────────── */

function SEOPanel({ q, setQ }: { q: Questionnaire; setQ: React.Dispatch<React.SetStateAction<Questionnaire>> }) {
  return (
    <div className="space-y-5">
      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs text-blue-900/70 flex items-start gap-2">
        <Search size={14} className="text-blue-500 mt-0.5 shrink-0" />
        <span>These fields control how your site appears in Google search results and when shared on Facebook, X, etc. Defaults are auto-generated from your business info.</span>
      </div>

      <Input full label={`SEO Title (${q.seo_title.length}/60)`} value={q.seo_title}
        placeholder={`${q.business_name || 'Business Name'} — ${q.service_areas || 'Local Contractor'}`}
        onChange={v => setQ(p => ({ ...p, seo_title: v.slice(0, 120) }))} />
      <Textarea full label={`SEO Description (${q.seo_description.length}/160)`} value={q.seo_description}
        placeholder="A trusted local contractor offering professional services with free estimates."
        onChange={v => setQ(p => ({ ...p, seo_description: v.slice(0, 240) }))} rows={2} />
      <Input full label="Social share image URL" value={q.social_image_url}
        placeholder="https://...jpg — 1200×630px works best"
        hint="Shown when someone shares your site on Facebook, X, etc. Leave blank to use your logo."
        onChange={v => setQ(p => ({ ...p, social_image_url: v }))} />

      <h3 className="text-sm font-bold text-gray-900 pt-2">Social Links</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Facebook"  value={q.social_facebook}  onChange={v => setQ(p => ({ ...p, social_facebook: v }))} placeholder="https://facebook.com/..." />
        <Input label="Instagram" value={q.social_instagram} onChange={v => setQ(p => ({ ...p, social_instagram: v }))} placeholder="https://instagram.com/..." />
        <Input label="X / Twitter" value={q.social_x}      onChange={v => setQ(p => ({ ...p, social_x: v }))} placeholder="https://x.com/..." />
        <Input label="LinkedIn"  value={q.social_linkedin} onChange={v => setQ(p => ({ ...p, social_linkedin: v }))} placeholder="https://linkedin.com/..." />
        <Input full label="Google Business Profile" value={q.social_google}
          placeholder="https://g.page/..."
          onChange={v => setQ(p => ({ ...p, social_google: v }))} />
      </div>
    </div>
  )
}

/* ── Content editor (with per-section regenerate + reorder + add/remove) ─ */

function ContentEditor({ content, setContent, sections, moveSection, regenSection, onRegenerate }: {
  content: Content
  setContent: React.Dispatch<React.SetStateAction<Content>>
  sections: string[]
  moveSection: (id: string, dir: -1 | 1) => void
  regenSection: string | null
  onRegenerate: (s: string) => void
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update = (section: string, key: string, value: any) => {
    setContent((prev: Content) => ({ ...prev, [section]: { ...(prev[section] || {}), [key]: value } }))
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateItem = (section: string, idx: number, key: string, value: any) => {
    setContent((prev: Content) => {
      const arr = [...((prev[section] as unknown[]) || [])] as Record<string, unknown>[]
      arr[idx] = { ...arr[idx], [key]: value }
      return { ...prev, [section]: arr }
    })
  }
  const addItem = (section: string, blank: Record<string, unknown>) => {
    setContent((prev: Content) => ({
      ...prev,
      [section]: [...((prev[section] as unknown[]) || []), blank],
    }))
  }
  const removeItem = (section: string, idx: number) => {
    setContent((prev: Content) => ({
      ...prev,
      [section]: ((prev[section] as unknown[]) || []).filter((_, i) => i !== idx),
    }))
  }

  return (
    <div className="space-y-6">
      {sections.map((sec, idx) => (
        <div key={sec} className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 capitalize">
                {sec === 'reviews' ? 'Testimonials' : sec}
              </h3>
              <span className="text-[10px] text-gray-400">#{idx + 1}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => moveSection(sec, -1)} disabled={idx === 0}
                className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 transition"><ArrowUp size={12} /></button>
              <button onClick={() => moveSection(sec, 1)} disabled={idx === sections.length - 1}
                className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 transition"><ArrowDown size={12} /></button>
              <button onClick={() => onRegenerate(sec)} disabled={regenSection === sec}
                className="flex items-center gap-1 ml-2 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition">
                {regenSection === sec
                  ? <><RefreshCw size={10} className="animate-spin" /> Generating...</>
                  : <><Sparkles size={10} /> Regenerate with AI</>}
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {sec === 'hero' && content.hero && (
              <>
                <Field label="Headline" value={content.hero.headline} onChange={v => update('hero', 'headline', v)} />
                <Field label="Subheadline" value={content.hero.subheadline} onChange={v => update('hero', 'subheadline', v)} textarea />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Primary CTA" value={content.hero.cta_primary} onChange={v => update('hero', 'cta_primary', v)} />
                  <Field label="Secondary CTA" value={content.hero.cta_secondary} onChange={v => update('hero', 'cta_secondary', v)} />
                </div>
              </>
            )}

            {sec === 'services' && Array.isArray(content.services) && (
              <>
                {content.services.map((svc: Record<string, string>, i: number) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl space-y-2 relative">
                    <button onClick={() => removeItem('services', i)}
                      className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 transition"><Trash2 size={12} /></button>
                    <div className="grid grid-cols-4 gap-2">
                      <Field label="Icon" value={svc.icon} onChange={v => updateItem('services', i, 'icon', v)} />
                      <div className="col-span-3">
                        <Field label="Name" value={svc.name} onChange={v => updateItem('services', i, 'name', v)} />
                      </div>
                    </div>
                    <Field label="Description" value={svc.description} onChange={v => updateItem('services', i, 'description', v)} textarea />
                  </div>
                ))}
                <button onClick={() => addItem('services', { name: '', description: '', icon: '🔧' })}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition w-full justify-center">
                  <Plus size={12} /> Add Service
                </button>
              </>
            )}

            {sec === 'about' && content.about && (
              <>
                <Field label="Headline" value={content.about.headline} onChange={v => update('about', 'headline', v)} />
                <Field label="Body" value={content.about.body} onChange={v => update('about', 'body', v)} textarea />
              </>
            )}

            {sec === 'gallery' && content.gallery && (
              <>
                <Field label="Headline" value={content.gallery.headline} onChange={v => update('gallery', 'headline', v)} />
                <Field label="Subheadline" value={content.gallery.subheadline} onChange={v => update('gallery', 'subheadline', v)} textarea />
                <p className="text-[10px] text-gray-400">Upload photos in the "Design & Photos" tab.</p>
              </>
            )}

            {sec === 'reviews' && Array.isArray(content.reviews) && (
              <>
                {content.reviews.map((r: Record<string, string | number>, i: number) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl space-y-2 relative">
                    <button onClick={() => removeItem('reviews', i)}
                      className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 transition"><Trash2 size={12} /></button>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Name" value={r.name as string} onChange={v => updateItem('reviews', i, 'name', v)} />
                      <Field label="Location" value={r.location as string} onChange={v => updateItem('reviews', i, 'location', v)} />
                    </div>
                    <Field label="Review" value={r.text as string} onChange={v => updateItem('reviews', i, 'text', v)} textarea />
                  </div>
                ))}
                <button onClick={() => addItem('reviews', { name: '', location: '', text: '', rating: 5 })}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition w-full justify-center">
                  <Plus size={12} /> Add Testimonial
                </button>
              </>
            )}

            {sec === 'contact' && content.contact && (
              <>
                <Field label="Headline" value={content.contact.headline} onChange={v => update('contact', 'headline', v)} />
                <Field label="Body" value={content.contact.body} onChange={v => update('contact', 'body', v)} textarea />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function Field({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  const cls = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {textarea
        ? <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={2} className={`${cls} resize-none`} />
        : <input value={value || ''} onChange={e => onChange(e.target.value)} className={cls} />
      }
    </div>
  )
}

/* ── Site renderer (preview) ───────────────────────────────────────────── */

function SiteRenderer({ content, q, theme, font, preview }:
  { content: Content; q: Questionnaire; theme: Theme; font: typeof FONTS[number]; preview?: boolean }) {
  const scale = preview ? 'text-[10px]' : 'text-base'

  return (
    <div className={`${scale} font-sans bg-white`} style={{ fontFamily: font.stack }}>
      {/* Nav */}
      {q.sections.includes('hero') && (
        <nav style={{ backgroundColor: theme.primary }} className="sticky top-0 z-10">
          <div className={`max-w-5xl mx-auto ${preview ? 'px-4 py-3' : 'px-6 py-5'} flex items-center justify-between gap-3`}>
            <div className="flex items-center gap-2 min-w-0">
              {q.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={q.logo_url} alt="" className={preview ? 'h-6 w-6 object-contain rounded' : 'h-9 w-9 object-contain rounded-md bg-white/10 p-1'} />
              )}
              <span className="font-bold text-white truncate">{q.business_name}</span>
            </div>
            <div className="flex gap-3 text-white/70 text-[0.8em]">
              {q.sections.filter(s => s !== 'hero').map(s => (
                <a key={s} href={`#${s}`} className="hover:text-white capitalize">{s === 'reviews' ? 'Testimonials' : s}</a>
              ))}
            </div>
          </div>
        </nav>
      )}

      {q.sections.map(sec => {
        if (sec === 'hero' && content.hero) {
          return (
            <section key={sec} id="hero" style={{ backgroundColor: theme.primary }} className="text-white">
              <div className={`max-w-3xl mx-auto ${preview ? 'px-4 py-8' : 'px-6 py-20'} text-center`}>
                {(q.licensed || q.insured || q.years_experience) && (
                  <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                    {q.licensed && <span style={{ backgroundColor: theme.accent }} className="text-[0.8em] px-2 py-0.5 rounded-full font-semibold text-white">✓ Licensed</span>}
                    {q.insured && <span style={{ backgroundColor: theme.accent }} className="text-[0.8em] px-2 py-0.5 rounded-full font-semibold text-white">✓ Insured</span>}
                    {q.years_experience && <span style={{ backgroundColor: theme.accent }} className="text-[0.8em] px-2 py-0.5 rounded-full font-semibold text-white">{q.years_experience} Experience</span>}
                  </div>
                )}
                <h1 className={`font-bold leading-tight mb-3 ${preview ? 'text-[1.8em]' : 'text-5xl'}`}>{content.hero.headline}</h1>
                <p className="text-white/70 mb-6 max-w-xl mx-auto">{content.hero.subheadline}</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <a href="#contact" style={{ backgroundColor: theme.accent }} className="font-bold px-5 py-2.5 rounded-xl text-white">{content.hero.cta_primary}</a>
                  <a href={`tel:${q.phone}`} className="font-semibold px-5 py-2.5 rounded-xl border border-white/30 text-white">{content.hero.cta_secondary}</a>
                </div>
              </div>
            </section>
          )
        }
        if (sec === 'services' && Array.isArray(content.services)) {
          return (
            <section key={sec} id="services" className={`max-w-5xl mx-auto ${preview ? 'px-4 py-6' : 'px-6 py-16'}`}>
              <div className="text-center mb-6">
                <h2 className={`font-bold ${preview ? 'text-[1.4em]' : 'text-3xl'}`} style={{ color: theme.primary }}>Our Services</h2>
                {q.service_areas && <p className="text-gray-500 mt-1 text-[0.9em]">Serving {q.service_areas}</p>}
              </div>
              <div className={`grid gap-3 ${preview ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                {content.services.map((svc: Record<string, string>, i: number) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition">
                    <div className="text-2xl mb-2">{svc.icon}</div>
                    <h3 className="font-bold text-gray-900 mb-1">{svc.name}</h3>
                    <p className="text-gray-500 text-[0.85em]">{svc.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )
        }
        if (sec === 'about' && content.about) {
          return (
            <section key={sec} id="about" style={{ backgroundColor: '#f8fafc' }} className={preview ? 'px-4 py-6' : 'px-6 py-16'}>
              <div className="max-w-3xl mx-auto">
                <h2 className={`font-bold mb-3 ${preview ? 'text-[1.4em]' : 'text-3xl'}`} style={{ color: theme.primary }}>{content.about.headline}</h2>
                <p className="text-gray-600 leading-relaxed">{content.about.body}</p>
              </div>
            </section>
          )
        }
        if (sec === 'gallery' && content.gallery) {
          const photos = q.gallery_images
          return (
            <section key={sec} id="gallery" className={`max-w-5xl mx-auto ${preview ? 'px-4 py-6' : 'px-6 py-16'}`}>
              <div className="text-center mb-5">
                <h2 className={`font-bold ${preview ? 'text-[1.4em]' : 'text-3xl'}`} style={{ color: theme.primary }}>{content.gallery.headline}</h2>
                <p className="text-gray-500 mt-1 text-[0.9em]">{content.gallery.subheadline}</p>
              </div>
              {photos.length === 0 ? (
                <div className={`grid gap-2 ${preview ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
                      <span className="text-gray-300 text-2xl">🏠</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`grid gap-2 ${preview ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
                  {photos.map((img, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={img.url} alt={img.caption || ''} className="aspect-square object-cover rounded-xl" />
                  ))}
                </div>
              )}
            </section>
          )
        }
        if (sec === 'reviews' && Array.isArray(content.reviews)) {
          return (
            <section key={sec} id="reviews" style={{ backgroundColor: '#f8fafc' }} className={preview ? 'px-4 py-6' : 'px-6 py-16'}>
              <div className="max-w-5xl mx-auto">
                <h2 className={`font-bold text-center mb-5 ${preview ? 'text-[1.4em]' : 'text-3xl'}`} style={{ color: theme.primary }}>What Customers Say</h2>
                <div className={`grid gap-3 ${preview ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
                  {content.reviews.map((r: Record<string, string | number>, i: number) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-xl p-4">
                      <div className="flex gap-0.5 mb-2">{'★★★★★'.split('').map((s, j) => <span key={j} style={{ color: theme.accent }}>{s}</span>)}</div>
                      <p className="text-gray-600 text-[0.85em] mb-3 italic">&ldquo;{r.text}&rdquo;</p>
                      <div>
                        <p className="font-semibold text-gray-900 text-[0.85em]">{r.name}</p>
                        <p className="text-gray-400 text-[0.75em]">{r.location}</p>
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
            <section key={sec} id="contact" style={{ backgroundColor: theme.primary }} className={`text-white ${preview ? 'px-4 py-6' : 'px-6 py-16'}`}>
              <div className="max-w-xl mx-auto text-center">
                <h2 className={`font-bold mb-2 ${preview ? 'text-[1.4em]' : 'text-3xl'}`}>{content.contact.headline}</h2>
                <p className="text-white/70 mb-5 text-[0.9em]">{content.contact.body}</p>
                {!preview && (
                  <form className="space-y-3 text-left max-w-sm mx-auto">
                    {['Name', 'Phone', 'Email'].map(f => (
                      <input key={f} placeholder={f} className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm focus:outline-none focus:bg-white/15" />
                    ))}
                    <textarea placeholder="Describe your project..." rows={3} className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm focus:outline-none focus:bg-white/15 resize-none" />
                    <button type="submit" style={{ backgroundColor: theme.accent }} className="w-full py-3 rounded-xl font-bold text-white">Send Message</button>
                  </form>
                )}
                <div className="mt-5 flex justify-center gap-4 text-white/70 text-[0.85em] flex-wrap">
                  {q.phone && <span>📞 {q.phone}</span>}
                  {q.email && <span>✉️ {q.email}</span>}
                  {q.service_areas && <span>📍 {q.service_areas}</span>}
                </div>
              </div>
            </section>
          )
        }
        return null
      })}
    </div>
  )
}
