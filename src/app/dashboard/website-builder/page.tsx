'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase-client'
import { Globe, Sparkles, Check, ChevronRight, ExternalLink, Copy, RefreshCw } from 'lucide-react'

const SECTION_OPTIONS = [
  { id: 'hero', label: 'Hero / Banner', desc: 'Top section with your headline and call-to-action' },
  { id: 'services', label: 'Services', desc: 'Showcase what you offer' },
  { id: 'about', label: 'About Us', desc: 'Your story and credentials' },
  { id: 'gallery', label: 'Gallery', desc: 'Photo grid of past work' },
  { id: 'reviews', label: 'Testimonials', desc: 'AI-generated sample reviews' },
  { id: 'contact', label: 'Contact', desc: 'Contact form and your info' },
]

const THEMES = [
  { id: 'navy', label: 'Navy', primary: '#0f1d35', accent: '#14b8a6' },
  { id: 'teal', label: 'Teal', primary: '#0d9488', accent: '#f97316' },
  { id: 'orange', label: 'Orange', primary: '#ea580c', accent: '#1e293b' },
  { id: 'slate', label: 'Slate', primary: '#334155', accent: '#14b8a6' },
]

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
  slug: string
  custom_domain: string
}

type Step = 'questionnaire' | 'generating' | 'editing' | 'published'

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function WebsiteBuilderPage() {
  const [step, setStep] = useState<Step>('questionnaire')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview')
  const [existingSiteId, setExistingSiteId] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [content, setContent] = useState<Record<string, any>>({})

  const [q, setQ] = useState<Questionnaire>({
    business_name: '',
    owner_name: '',
    tagline: '',
    about_story: '',
    services: [],
    service_areas: '',
    phone: '',
    email: '',
    years_experience: '',
    licensed: false,
    insured: false,
    sections: ['hero', 'services', 'about', 'contact'],
    theme: 'navy',
    slug: '',
    custom_domain: '',
  })

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const uid = session.user.id
      const meta = session.user.user_metadata ?? {}

      const [{ data: profile }, { data: contractor }, { data: site }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('pl_contractors').select('*').eq('id', uid).single(),
        supabase.from('contractor_websites').select('*').eq('contractor_id', uid).single(),
      ])

      const bName = profile?.business_name || meta.business_name || ''
      const oName = profile?.full_name || meta.full_name || ''
      const phone = contractor?.phone || meta.phone || ''
      const serviceAreas = contractor?.service_areas || ''
      const specialties: string[] = contractor?.specialties || []
      const years = contractor?.years_experience || ''
      const licensed = contractor?.licensed === 'yes'
      const insured = contractor?.insured === 'yes'

      if (site) {
        setExistingSiteId(site.id)
        setQ({
          business_name: site.business_name || bName,
          owner_name: site.owner_name || oName,
          tagline: site.tagline || '',
          about_story: site.about_story || '',
          services: site.services || specialties,
          service_areas: site.service_areas || serviceAreas,
          phone: site.phone || phone,
          email: site.email || session.user.email || '',
          years_experience: site.years_experience || years,
          licensed: site.licensed ?? licensed,
          insured: site.insured ?? insured,
          sections: site.sections || ['hero', 'services', 'about', 'contact'],
          theme: site.theme || 'navy',
          slug: site.slug || slugify(bName),
          custom_domain: site.custom_domain || '',
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
          service_areas: serviceAreas,
          services: specialties,
          years_experience: years,
          licensed,
          insured,
          slug: slugify(bName),
        }))
      }

      setLoading(false)
    }
    loadProfile()
  }, [])

  const toggleSection = (id: string) => {
    setQ(prev => ({
      ...prev,
      sections: prev.sections.includes(id)
        ? prev.sections.filter(s => s !== id)
        : [...prev.sections, id],
    }))
  }

  const handleServiceInput = (val: string) => {
    const services = val.split(',').map(s => s.trim()).filter(Boolean)
    setQ(prev => ({ ...prev, services }))
  }

  const generate = async () => {
    if (!q.business_name) { setError('Business name is required'); return }
    if (q.sections.length === 0) { setError('Select at least one section'); return }
    setError('')
    setStep('generating')

    try {
      const res = await fetch('/api/generate-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionnaire: q }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed')
      setContent(data.content)
      setStep('editing')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Generation failed'
      setError(msg)
      setStep('questionnaire')
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

  const theme = THEMES.find(t => t.id === q.theme) || THEMES[0]
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
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
            <Globe size={18} className="text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Website Builder</h1>
        </div>
        <p className="text-gray-500 text-sm">AI-powered websites for your contracting business — live in minutes.</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {(['questionnaire', 'generating', 'editing', 'published'] as Step[]).map((s, i) => {
          const labels = ['Setup', 'Generating', 'Review & Edit', 'Published']
          const done = ['questionnaire', 'generating', 'editing', 'published'].indexOf(step) > i
          const active = step === s
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                done ? 'bg-teal-100 text-teal-700' : active ? 'bg-[#0f1d35] text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {done ? <Check size={11} /> : <span>{i + 1}</span>}
                {labels[i]}
              </div>
              {i < 3 && <ChevronRight size={14} className="text-gray-300" />}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      {/* QUESTIONNAIRE */}
      {step === 'questionnaire' && (
        <div className="space-y-6">
          {/* Business Basics */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-1">About Your Business</h2>
            <p className="text-xs text-gray-400 mb-5">Pre-filled from your profile — update anything that's changed.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Business Name *</label>
                <input value={q.business_name} onChange={e => setQ(p => ({ ...p, business_name: e.target.value, slug: slugify(e.target.value) }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Owner Name</label>
                <input value={q.owner_name} onChange={e => setQ(p => ({ ...p, owner_name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Your Tagline</label>
                <input value={q.tagline} onChange={e => setQ(p => ({ ...p, tagline: e.target.value }))}
                  placeholder="e.g. Quality Work, On Time, Every Time"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Your Story</label>
                <textarea value={q.about_story} onChange={e => setQ(p => ({ ...p, about_story: e.target.value }))}
                  rows={3} placeholder="Tell us a bit about your business — why you started, what you stand for, what makes you different..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none" />
              </div>
            </div>
          </div>

          {/* Services & Contact */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-1">Services & Contact</h2>
            <p className="text-xs text-gray-400 mb-5">How customers find and reach you.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Services (comma-separated)</label>
                <input value={q.services.join(', ')} onChange={e => handleServiceInput(e.target.value)}
                  placeholder="Kitchen Remodeling, Bathroom Renovation, Roofing..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
                {q.services.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {q.services.map(s => (
                      <span key={s} className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Service Areas</label>
                <input value={q.service_areas} onChange={e => setQ(p => ({ ...p, service_areas: e.target.value }))}
                  placeholder="Salt Lake City, West Valley..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
                <input value={q.phone} onChange={e => setQ(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                <input type="email" value={q.email} onChange={e => setQ(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
              </div>
            </div>
          </div>

          {/* Credentials & Design */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-1">Credentials & Design</h2>
            <p className="text-xs text-gray-400 mb-5">Builds trust with potential customers.</p>
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
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Licensed?</label>
                <div className="flex gap-2">
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => setQ(p => ({ ...p, licensed: v }))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition ${q.licensed === v ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {v ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Insured?</label>
                <div className="flex gap-2">
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => setQ(p => ({ ...p, insured: v }))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition ${q.insured === v ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {v ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Page Sections</label>
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

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Color Theme</label>
              <div className="flex gap-3">
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
          </div>

          {/* Site URL */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-1">Your Site URL</h2>
            <p className="text-xs text-gray-400 mb-4">Your website will be live at this address.</p>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap">
                {typeof window !== 'undefined' ? window.location.host : 'useezly.com'}/sites/
              </span>
              <input value={q.slug} onChange={e => setQ(p => ({ ...p, slug: slugify(e.target.value) }))}
                className="flex-1 px-3 py-2.5 text-sm outline-none font-mono" />
            </div>
            <div className="mt-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Custom Domain (optional)</label>
              <input value={q.custom_domain} onChange={e => setQ(p => ({ ...p, custom_domain: e.target.value }))}
                placeholder="www.yourdomain.com"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
              <p className="text-[10px] text-gray-400 mt-1">Point your domain's CNAME to useezly.com after publishing.</p>
            </div>
          </div>

          <button onClick={generate} disabled={!q.business_name || q.sections.length === 0}
            className="w-full py-4 bg-[#0f1d35] hover:bg-[#0a1628] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2 text-sm">
            <Sparkles size={16} /> Generate My Website with AI
          </button>
        </div>
      )}

      {/* GENERATING */}
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
          <div className="flex gap-2">
            {q.sections.map(s => (
              <span key={s} className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-full font-medium capitalize">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* EDITING */}
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
                <RefreshCw size={12} /> Regenerate
              </button>
              <button onClick={() => save(false)} disabled={saving}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition">
                Save Draft
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
            <div className="flex border-b border-gray-100">
              {(['preview', 'edit'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-5 py-3 text-sm font-semibold capitalize transition ${activeTab === t ? 'border-b-2 border-teal-500 text-teal-700' : 'text-gray-400 hover:text-gray-600'}`}>
                  {t === 'preview' ? 'Preview' : 'Edit Content'}
                </button>
              ))}
            </div>

            {activeTab === 'preview' && (
              <div className="p-4">
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                  <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center px-3 gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    <span className="ml-3 text-[10px] text-gray-400 font-mono">{siteUrl}</span>
                  </div>
                  <div className="h-[600px] overflow-y-auto">
                    <SiteRenderer content={content} q={q} theme={theme} preview />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'edit' && (
              <div className="p-6 space-y-6">
                <ContentEditor content={content} setContent={setContent} sections={q.sections} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Content Editor ─────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ContentEditor({ content, setContent, sections }: { content: Record<string, any>, setContent: (c: any) => void, sections: string[] }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update = (section: string, key: string, value: any) => {
    setContent((prev: Record<string, unknown>) => ({ ...prev, [section]: { ...(prev[section] as Record<string, unknown> || {}), [key]: value } }))
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateItem = (section: string, idx: number, key: string, value: any) => {
    setContent((prev: Record<string, unknown>) => {
      const arr = [...((prev[section] as unknown[]) || [])] as Record<string, unknown>[]
      arr[idx] = { ...arr[idx], [key]: value }
      return { ...prev, [section]: arr }
    })
  }

  return (
    <div className="space-y-6">
      {sections.includes('hero') && content.hero && (
        <Section label="Hero">
          <Field label="Headline" value={content.hero.headline} onChange={v => update('hero', 'headline', v)} />
          <Field label="Subheadline" value={content.hero.subheadline} onChange={v => update('hero', 'subheadline', v)} textarea />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Primary CTA" value={content.hero.cta_primary} onChange={v => update('hero', 'cta_primary', v)} />
            <Field label="Secondary CTA" value={content.hero.cta_secondary} onChange={v => update('hero', 'cta_secondary', v)} />
          </div>
        </Section>
      )}

      {sections.includes('services') && Array.isArray(content.services) && (
        <Section label="Services">
          {content.services.map((svc: Record<string, string>, i: number) => (
            <div key={i} className="p-3 bg-gray-50 rounded-xl space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <Field label="Icon" value={svc.icon} onChange={v => updateItem('services', i, 'icon', v)} />
                <div className="col-span-3">
                  <Field label="Name" value={svc.name} onChange={v => updateItem('services', i, 'name', v)} />
                </div>
              </div>
              <Field label="Description" value={svc.description} onChange={v => updateItem('services', i, 'description', v)} textarea />
            </div>
          ))}
        </Section>
      )}

      {sections.includes('about') && content.about && (
        <Section label="About">
          <Field label="Headline" value={content.about.headline} onChange={v => update('about', 'headline', v)} />
          <Field label="Body" value={content.about.body} onChange={v => update('about', 'body', v)} textarea />
        </Section>
      )}

      {sections.includes('gallery') && content.gallery && (
        <Section label="Gallery">
          <Field label="Headline" value={content.gallery.headline} onChange={v => update('gallery', 'headline', v)} />
          <Field label="Subheadline" value={content.gallery.subheadline} onChange={v => update('gallery', 'subheadline', v)} textarea />
        </Section>
      )}

      {sections.includes('reviews') && Array.isArray(content.reviews) && (
        <Section label="Testimonials">
          {content.reviews.map((r: Record<string, string | number>, i: number) => (
            <div key={i} className="p-3 bg-gray-50 rounded-xl space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Name" value={r.name as string} onChange={v => updateItem('reviews', i, 'name', v)} />
                <Field label="Location" value={r.location as string} onChange={v => updateItem('reviews', i, 'location', v)} />
              </div>
              <Field label="Review" value={r.text as string} onChange={v => updateItem('reviews', i, 'text', v)} textarea />
            </div>
          ))}
        </Section>
      )}

      {sections.includes('contact') && content.contact && (
        <Section label="Contact">
          <Field label="Headline" value={content.contact.headline} onChange={v => update('contact', 'headline', v)} />
          <Field label="Body" value={content.contact.body} onChange={v => update('contact', 'body', v)} textarea />
        </Section>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{label}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, textarea }: { label: string, value: string, onChange: (v: string) => void, textarea?: boolean }) {
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

/* ── Site Renderer ──────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SiteRenderer({ content, q, theme, preview }: { content: Record<string, any>, q: Questionnaire, theme: typeof THEMES[0], preview?: boolean }) {
  const scale = preview ? 'text-[10px]' : 'text-base'
  const pad = preview ? 'px-4 py-3' : 'px-6 py-5'

  return (
    <div className={`${scale} font-sans bg-white`} style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      {q.sections.includes('hero') && (
        <nav style={{ backgroundColor: theme.primary }} className="sticky top-0 z-10">
          <div className={`max-w-5xl mx-auto ${pad} flex items-center justify-between`}>
            <span className="font-bold text-white">{q.business_name}</span>
            <div className="flex gap-4 text-white/70 text-[0.8em]">
              {q.sections.filter(s => s !== 'hero').map(s => (
                <a key={s} href={`#${s}`} className="hover:text-white capitalize">{s === 'reviews' ? 'Testimonials' : s}</a>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Hero */}
      {q.sections.includes('hero') && content.hero && (
        <section id="hero" style={{ backgroundColor: theme.primary }} className="text-white">
          <div className={`max-w-3xl mx-auto ${preview ? 'px-4 py-8' : 'px-6 py-20'} text-center`}>
            {(q.licensed || q.insured) && (
              <div className="flex items-center justify-center gap-2 mb-4">
                {q.licensed && <span style={{ backgroundColor: theme.accent, color: '#fff' }} className="text-[0.8em] px-2 py-0.5 rounded-full font-semibold">✓ Licensed</span>}
                {q.insured && <span style={{ backgroundColor: theme.accent, color: '#fff' }} className="text-[0.8em] px-2 py-0.5 rounded-full font-semibold">✓ Insured</span>}
                {q.years_experience && <span style={{ backgroundColor: theme.accent, color: '#fff' }} className="text-[0.8em] px-2 py-0.5 rounded-full font-semibold">{q.years_experience} Experience</span>}
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
      )}

      {/* Services */}
      {q.sections.includes('services') && Array.isArray(content.services) && (
        <section id="services" className={`max-w-5xl mx-auto ${preview ? 'px-4 py-6' : 'px-6 py-16'}`}>
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
      )}

      {/* About */}
      {q.sections.includes('about') && content.about && (
        <section id="about" style={{ backgroundColor: '#f8fafc' }} className={preview ? 'px-4 py-6' : 'px-6 py-16'}>
          <div className="max-w-3xl mx-auto">
            <h2 className={`font-bold mb-3 ${preview ? 'text-[1.4em]' : 'text-3xl'}`} style={{ color: theme.primary }}>{content.about.headline}</h2>
            <p className="text-gray-600 leading-relaxed">{content.about.body}</p>
            <div className="flex gap-4 mt-5">
              {q.licensed && <div className="flex items-center gap-1.5 text-[0.85em]"><span style={{ color: theme.accent }}>✓</span><span className="font-semibold">Licensed</span></div>}
              {q.insured && <div className="flex items-center gap-1.5 text-[0.85em]"><span style={{ color: theme.accent }}>✓</span><span className="font-semibold">Insured</span></div>}
              {q.years_experience && <div className="flex items-center gap-1.5 text-[0.85em]"><span style={{ color: theme.accent }}>✓</span><span className="font-semibold">{q.years_experience} in business</span></div>}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {q.sections.includes('gallery') && content.gallery && (
        <section id="gallery" className={`max-w-5xl mx-auto ${preview ? 'px-4 py-6' : 'px-6 py-16'}`}>
          <div className="text-center mb-5">
            <h2 className={`font-bold ${preview ? 'text-[1.4em]' : 'text-3xl'}`} style={{ color: theme.primary }}>{content.gallery.headline}</h2>
            <p className="text-gray-500 mt-1 text-[0.9em]">{content.gallery.subheadline}</p>
          </div>
          <div className={`grid gap-2 ${preview ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
                <span className="text-gray-300 text-2xl">🏠</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      {q.sections.includes('reviews') && Array.isArray(content.reviews) && (
        <section id="reviews" style={{ backgroundColor: '#f8fafc' }} className={preview ? 'px-4 py-6' : 'px-6 py-16'}>
          <div className="max-w-5xl mx-auto">
            <h2 className={`font-bold text-center mb-5 ${preview ? 'text-[1.4em]' : 'text-3xl'}`} style={{ color: theme.primary }}>What Customers Say</h2>
            <div className={`grid gap-3 ${preview ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
              {content.reviews.map((r: Record<string, string | number>, i: number) => (
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex gap-0.5 mb-2">{'★★★★★'.split('').map((s, j) => <span key={j} style={{ color: theme.accent }}>{s}</span>)}</div>
                  <p className="text-gray-600 text-[0.85em] mb-3 italic">"{r.text}"</p>
                  <div>
                    <p className="font-semibold text-gray-900 text-[0.85em]">{r.name}</p>
                    <p className="text-gray-400 text-[0.75em]">{r.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      {q.sections.includes('contact') && content.contact && (
        <section id="contact" style={{ backgroundColor: theme.primary }} className={`text-white ${preview ? 'px-4 py-6' : 'px-6 py-16'}`}>
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
      )}
    </div>
  )
}
