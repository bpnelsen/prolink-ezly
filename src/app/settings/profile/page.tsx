'use client'
import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Save, Camera, ExternalLink } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import { supabase } from '../../../lib/supabase-client'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

const HOUR_OPTIONS = [
  'Closed',
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM',
  '10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM',
  '1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM',
  '5:00 PM','5:30 PM','6:00 PM','6:30 PM','7:00 PM','8:00 PM','9:00 PM',
]

type HoursValue = { open: string; close: string }
type BusinessHours = Record<string, HoursValue>

interface FormState {
  // Identity
  owner_name: string
  email: string
  business_name: string
  phone: string
  logo_url: string
  // Credentials
  trade: string
  years_in_business: string
  entity_type: string
  ein: string
  license_number: string
  license_expiration: string
  insurance_provider: string
  insurance_policy_number: string
  insurance_expiration: string
  // Location
  street_address: string
  city: string
  state: string
  zip_code: string
  service_areas: string
  // Online
  website: string
  facebook_url: string
  instagram_url: string
  nextdoor_url: string
  // Brand & Defaults
  brand_color: string
  default_payment_terms: string
  default_tax_rate: string
  default_invoice_notes: string
  description: string
  // Availability
  status: string
  // Notifications
  notify_new_jobs: boolean
  notify_payments: boolean
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState<string>('')
  const [siteSlug, setSiteSlug] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormState>({
    owner_name: '',
    email: '',
    business_name: '',
    phone: '',
    logo_url: '',
    trade: '',
    years_in_business: '',
    entity_type: 'sole_proprietor',
    ein: '',
    license_number: '',
    license_expiration: '',
    insurance_provider: '',
    insurance_policy_number: '',
    insurance_expiration: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    service_areas: '',
    website: '',
    facebook_url: '',
    instagram_url: '',
    nextdoor_url: '',
    brand_color: '#14b8a6',
    default_payment_terms: 'net_30',
    default_tax_rate: '0',
    default_invoice_notes: '',
    description: '',
    status: 'available',
    notify_new_jobs: true,
    notify_payments: true,
  })

  const [hours, setHours] = useState<BusinessHours>({
    monday: { open: '8:00 AM', close: '5:00 PM' },
    tuesday: { open: '8:00 AM', close: '5:00 PM' },
    wednesday: { open: '8:00 AM', close: '5:00 PM' },
    thursday: { open: '8:00 AM', close: '5:00 PM' },
    friday: { open: '8:00 AM', close: '5:00 PM' },
    saturday: { open: 'Closed', close: 'Closed' },
    sunday: { open: 'Closed', close: 'Closed' },
  })

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = e.target.type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value
      setForm(prev => ({ ...prev, [field]: val }))
      setSaved(false)
    }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profile }, { data: contractor }, { data: site }] = await Promise.all([
        supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
        supabase.from('customers').select('*').eq('id', user.id).single(),
        supabase.from('pl_sites').select('slug').eq('contractor_id', user.id).maybeSingle(),
      ])

      if (site?.slug) setSiteSlug(site.slug)

      const parseHours = (val: string | null): HoursValue => {
        if (!val || val === 'Closed') return { open: 'Closed', close: 'Closed' }
        const [o, c] = val.split('|')
        return { open: o || '8:00 AM', close: c || '5:00 PM' }
      }

      if (contractor) {
        setHours({
          monday: parseHours(contractor.monday_hours),
          tuesday: parseHours(contractor.tuesday_hours),
          wednesday: parseHours(contractor.wednesday_hours),
          thursday: parseHours(contractor.thursday_hours),
          friday: parseHours(contractor.friday_hours),
          saturday: parseHours(contractor.saturday_hours),
          sunday: parseHours(contractor.sunday_hours),
        })
      }

      setForm(prev => ({
        ...prev,
        owner_name: profile?.full_name || '',
        email: profile?.email || user.email || '',
        business_name: contractor?.business_name || '',
        phone: contractor?.phone || '',
        logo_url: contractor?.logo_url || '',
        trade: contractor?.trade || '',
        years_in_business: contractor?.years_in_business ? String(contractor.years_in_business) : '',
        entity_type: contractor?.entity_type || 'sole_proprietor',
        ein: contractor?.ein || '',
        license_number: contractor?.license_number || '',
        license_expiration: contractor?.license_expiration || '',
        insurance_provider: contractor?.insurance_provider || '',
        insurance_policy_number: contractor?.insurance_policy_number || '',
        insurance_expiration: contractor?.insurance_expiration || '',
        street_address: contractor?.street_address || '',
        city: contractor?.city || '',
        state: contractor?.state || '',
        zip_code: contractor?.zip_code || '',
        service_areas: contractor?.service_areas || '',
        website: contractor?.website || '',
        facebook_url: contractor?.facebook_url || '',
        instagram_url: contractor?.instagram_url || '',
        nextdoor_url: contractor?.nextdoor_url || '',
        brand_color: contractor?.brand_color || '#14b8a6',
        default_payment_terms: contractor?.default_payment_terms || 'net_30',
        default_tax_rate: contractor?.default_tax_rate != null ? String(contractor.default_tax_rate) : '0',
        default_invoice_notes: contractor?.default_invoice_notes || '',
        description: contractor?.description || '',
        status: contractor?.status || 'available',
        notify_new_jobs: contractor?.notify_new_jobs ?? true,
        notify_payments: contractor?.notify_payments ?? true,
      }))
    }
    load()
  }, [])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLogoError('')

    // Basic guardrails so we fail fast with a useful message.
    if (!file.type.startsWith('image/')) {
      setLogoError('Please choose an image file (PNG, JPG, SVG, or WEBP).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError('Image is larger than 5 MB. Please pick a smaller file.')
      return
    }

    setUploadingLogo(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLogoError('You must be signed in to upload a logo.')
        return
      }
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `logos/${user.id}.${ext}`
      const { error } = await supabase.storage
        .from('contractor-assets')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (error) {
        // Surface the underlying reason — most often "Bucket not found"
        // (the contractor-assets bucket needs to be created in Supabase
        // Storage with public read access) or an RLS policy issue.
        const msg = (error.message || '').toLowerCase()
        if (msg.includes('bucket') && msg.includes('not')) {
          setLogoError('Logo storage isn\'t set up yet. Ask an admin to create a public "contractor-assets" bucket in Supabase Storage.')
        } else if (msg.includes('row-level security') || msg.includes('permission') || msg.includes('not authorized')) {
          setLogoError('Permission denied uploading the logo. Check the storage policies on the "contractor-assets" bucket.')
        } else {
          setLogoError(`Couldn't upload logo: ${error.message}`)
        }
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('contractor-assets').getPublicUrl(path)
      // Cache-bust so an updated logo appears immediately
      const bustedUrl = `${publicUrl}?v=${Date.now()}`
      setForm(prev => ({ ...prev, logo_url: bustedUrl }))

      // Persist the URL right away so users don't have to remember to
      // click Save just to keep the logo they just uploaded.
      const { error: saveErr } = await supabase
        .from('customers')
        .upsert({ id: user.id, logo_url: bustedUrl }, { onConflict: 'id' })
      if (saveErr) {
        setLogoError(`Logo uploaded but couldn't be saved to your profile: ${saveErr.message}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setLogoError(`Couldn't upload logo: ${message}`)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const serializeHours = (h: HoursValue) =>
      h.open === 'Closed' ? 'Closed' : `${h.open}|${h.close}`

    const [profileErr, contractorErr] = await Promise.all([
      supabase.from('profiles').update({ full_name: form.owner_name.trim() || null }).eq('id', user.id).then(r => r.error),
      supabase.from('customers').upsert({
        id: user.id,
        business_name: form.business_name.trim() || null,
        phone: form.phone.trim() || null,
        logo_url: form.logo_url || null,
        trade: form.trade.trim() || null,
        years_in_business: form.years_in_business ? parseInt(form.years_in_business) : null,
        entity_type: form.entity_type || null,
        ein: form.ein.trim() || null,
        license_number: form.license_number.trim() || null,
        license_expiration: form.license_expiration || null,
        insurance_provider: form.insurance_provider.trim() || null,
        insurance_policy_number: form.insurance_policy_number.trim() || null,
        insurance_expiration: form.insurance_expiration || null,
        street_address: form.street_address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zip_code: form.zip_code.trim() || null,
        service_areas: form.service_areas.trim() || null,
        website: form.website.trim() || null,
        facebook_url: form.facebook_url.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        nextdoor_url: form.nextdoor_url.trim() || null,
        brand_color: form.brand_color || '#14b8a6',
        default_payment_terms: form.default_payment_terms || 'net_30',
        default_tax_rate: parseFloat(form.default_tax_rate) || 0,
        default_invoice_notes: form.default_invoice_notes.trim() || null,
        description: form.description.trim() || null,
        status: form.status || 'available',
        notify_new_jobs: form.notify_new_jobs,
        notify_payments: form.notify_payments,
        monday_hours: serializeHours(hours.monday),
        tuesday_hours: serializeHours(hours.tuesday),
        wednesday_hours: serializeHours(hours.wednesday),
        thursday_hours: serializeHours(hours.thursday),
        friday_hours: serializeHours(hours.friday),
        saturday_hours: serializeHours(hours.saturday),
        sunday_hours: serializeHours(hours.sunday),
        updated_at: new Date().toISOString(),
      }).then(r => r.error),
    ])

    setLoading(false)
    if (!profileErr && !contractorErr) setSaved(true)
  }

  const inputCls = 'w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition outline-none'
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5'
  const sectionHeadingCls = 'font-bold text-sm text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-3 mb-5'

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Company Profile', href: '/settings/profile' }]} />
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Settings</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Company Profile</h2>

        {saved && (
          <div className="flex items-center gap-3 mb-6 p-4 bg-teal-50 text-teal-700 rounded-xl text-sm font-semibold">
            <CheckCircle2 size={16} /> Profile saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── Identity & Contact ── */}
          <section className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-5">
            <h3 className={sectionHeadingCls}>Identity &amp; Contact</h3>

            {/* Logo Upload */}
            <div>
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center">
                    {form.logo_url
                      ? <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      : <Camera size={22} className="text-gray-400" />}
                  </div>
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-7 h-7 bg-teal-600 rounded-full flex items-center justify-center shadow-md hover:bg-teal-700 transition"
                    aria-label="Upload logo">
                    <Camera size={13} className="text-white" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-700">Company Logo</p>
                  <p className="text-xs text-gray-400 mt-0.5">{uploadingLogo ? 'Uploading…' : 'PNG, JPG, SVG or WEBP — up to 5 MB'}</p>
                  {form.logo_url && !uploadingLogo && (
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, logo_url: '' }))}
                      className="text-xs text-gray-500 hover:text-red-600 underline mt-1">
                      Remove logo
                    </button>
                  )}
                </div>
              </div>
              {logoError && (
                <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {logoError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>Business Name</label>
                <input value={form.business_name} onChange={set('business_name')} className={inputCls} placeholder="ABC Plumbing & Heating" />
              </div>
              <div>
                <label className={labelCls}>Owner / Contact Name</label>
                <input value={form.owner_name} onChange={set('owner_name')} className={inputCls} placeholder="John Smith" />
              </div>
              <div>
                <label className={labelCls}>Email Address</label>
                <input value={form.email} readOnly className={`${inputCls} opacity-60 cursor-not-allowed`} />
              </div>
              <div>
                <label className={labelCls}>Phone Number</label>
                <input value={form.phone} onChange={set('phone')} type="tel" className={inputCls} placeholder="(801) 555-0100" />
              </div>
              <div>
                <label className={labelCls}>Availability Status</label>
                <select value={form.status} onChange={set('status')} className={inputCls}>
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="on_break">On Break</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Business Description</label>
              <textarea value={form.description} onChange={set('description')} rows={3}
                className={`${inputCls} resize-none`}
                placeholder="Brief description of your services and areas you serve..." />
            </div>
          </section>

          {/* ── Business Credentials ── */}
          <section className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-5">
            <h3 className={sectionHeadingCls}>Business Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Trade / Primary Specialty</label>
                <input value={form.trade} onChange={set('trade')} className={inputCls} placeholder="Plumber, Electrician, HVAC…" />
              </div>
              <div>
                <label className={labelCls}>Years in Business</label>
                <input value={form.years_in_business} onChange={set('years_in_business')} type="number" min="0" className={inputCls} placeholder="5" />
              </div>
              <div>
                <label className={labelCls}>Business Entity Type</label>
                <select value={form.entity_type} onChange={set('entity_type')} className={inputCls}>
                  <option value="sole_proprietor">Sole Proprietor</option>
                  <option value="llc">LLC</option>
                  <option value="corporation">Corporation</option>
                  <option value="partnership">Partnership</option>
                  <option value="s_corp">S-Corp</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>EIN / Tax ID</label>
                <input value={form.ein} onChange={set('ein')} className={inputCls} placeholder="XX-XXXXXXX" />
              </div>
              <div>
                <label className={labelCls}>Contractor License #</label>
                <input value={form.license_number} onChange={set('license_number')} className={inputCls} placeholder="LIC-000000" />
              </div>
              <div>
                <label className={labelCls}>License Expiration</label>
                <input value={form.license_expiration} onChange={set('license_expiration')} type="date" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Insurance Provider</label>
                <input value={form.insurance_provider} onChange={set('insurance_provider')} className={inputCls} placeholder="State Farm, Nationwide…" />
              </div>
              <div>
                <label className={labelCls}>Policy Number</label>
                <input value={form.insurance_policy_number} onChange={set('insurance_policy_number')} className={inputCls} placeholder="POL-XXXXXXXX" />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Insurance Expiration</label>
                <input value={form.insurance_expiration} onChange={set('insurance_expiration')} type="date" className={inputCls} />
              </div>
            </div>
          </section>

          {/* ── Location & Service Area ── */}
          <section id="service-area" className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-5">
            <h3 className={sectionHeadingCls}>Location &amp; Service Area</h3>
            <div>
              <label className={labelCls}>Street Address</label>
              <input value={form.street_address} onChange={set('street_address')} className={inputCls} placeholder="456 Commerce Ave, Suite 100" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>City</label>
                <input value={form.city} onChange={set('city')} className={inputCls} placeholder="Salt Lake City" />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input value={form.state} onChange={set('state')} className={inputCls} placeholder="UT" maxLength={2} />
              </div>
              <div>
                <label className={labelCls}>Zip Code</label>
                <input value={form.zip_code} onChange={set('zip_code')} className={inputCls} placeholder="84101" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Service Areas</label>
              <input value={form.service_areas} onChange={set('service_areas')} className={inputCls}
                placeholder="Salt Lake City, Provo, Ogden, Park City" />
              <p className="text-xs text-gray-400 mt-1.5">Separate cities or zip codes with commas</p>
            </div>
          </section>

          {/* ── Business Hours ── */}
          <section id="business-hours" className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-4">
            <h3 className={sectionHeadingCls}>Business Hours</h3>
            {DAYS.map((day) => {
              const isClosed = hours[day].open === 'Closed'
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-10 text-xs font-bold text-gray-500">{DAY_LABELS[day]}</span>
                  <button
                    type="button"
                    onClick={() => setHours(h => ({ ...h, [day]: isClosed ? { open: '8:00 AM', close: '5:00 PM' } : { open: 'Closed', close: 'Closed' } }))}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition cursor-pointer ${!isClosed ? 'bg-teal-500' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition ${!isClosed ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  {isClosed ? (
                    <span className="text-xs text-gray-400 italic">Closed</span>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <select value={hours[day].open}
                        onChange={e => setHours(h => ({ ...h, [day]: { ...h[day], open: e.target.value } }))}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none">
                        {HOUR_OPTIONS.filter(o => o !== 'Closed').map(o => <option key={o}>{o}</option>)}
                      </select>
                      <span className="text-xs text-gray-400">to</span>
                      <select value={hours[day].close}
                        onChange={e => setHours(h => ({ ...h, [day]: { ...h[day], close: e.target.value } }))}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none">
                        {HOUR_OPTIONS.filter(o => o !== 'Closed').map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </section>

          {/* ── Online Presence ── */}
          <section className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-5">
            <h3 className={sectionHeadingCls}>Online Presence</h3>
            {siteSlug && (
              <a href={`/sites/${siteSlug}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-sm text-teal-600 font-semibold hover:underline">
                <ExternalLink size={14} />
                View your Prolink site: /sites/{siteSlug}
              </a>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>Website URL</label>
                <input value={form.website} onChange={set('website')} type="url" className={inputCls} placeholder="https://yourbusiness.com" />
              </div>
              <div>
                <label className={labelCls}>Facebook</label>
                <input value={form.facebook_url} onChange={set('facebook_url')} type="url" className={inputCls} placeholder="https://facebook.com/yourpage" />
              </div>
              <div>
                <label className={labelCls}>Instagram</label>
                <input value={form.instagram_url} onChange={set('instagram_url')} type="url" className={inputCls} placeholder="https://instagram.com/yourhandle" />
              </div>
              <div>
                <label className={labelCls}>Nextdoor</label>
                <input value={form.nextdoor_url} onChange={set('nextdoor_url')} type="url" className={inputCls} placeholder="https://nextdoor.com/pages/your-business" />
              </div>
            </div>
          </section>

          {/* ── Brand & Invoice Defaults ── */}
          <section className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-5">
            <h3 className={sectionHeadingCls}>Brand &amp; Invoice Defaults</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Brand Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.brand_color} onChange={set('brand_color')}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white" />
                  <input value={form.brand_color} onChange={set('brand_color')} className={`${inputCls} flex-1`} placeholder="#14b8a6" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Default Payment Terms</label>
                <select value={form.default_payment_terms} onChange={set('default_payment_terms')} className={inputCls}>
                  <option value="due_on_receipt">Due on Receipt</option>
                  <option value="net_7">Net 7</option>
                  <option value="net_15">Net 15</option>
                  <option value="net_30">Net 30</option>
                  <option value="net_45">Net 45</option>
                  <option value="net_60">Net 60</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Default Tax Rate (%)</label>
                <input value={form.default_tax_rate} onChange={set('default_tax_rate')} type="number" step="0.01" min="0" max="30" className={inputCls} placeholder="8.25" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Default Invoice Footer / Terms</label>
              <textarea value={form.default_invoice_notes} onChange={set('default_invoice_notes')} rows={3}
                className={`${inputCls} resize-none`}
                placeholder="Payment due within 30 days. Late payments subject to 1.5% monthly fee." />
            </div>
          </section>

          {/* ── Notifications ── */}
          <section className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-4">
            <h3 className={sectionHeadingCls}>Notifications</h3>
            {[
              { field: 'notify_new_jobs' as const, label: 'New job assigned', desc: 'Email me when a new job is added to my schedule' },
              { field: 'notify_payments' as const, label: 'Payment received', desc: 'Email me when an invoice is paid' },
            ].map(({ field, label, desc }) => (
              <div key={field} className="flex items-center justify-between gap-4 py-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setForm(prev => ({ ...prev, [field]: !prev[field] })); setSaved(false) }}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition cursor-pointer ${form[field] ? 'bg-teal-500' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition ${form[field] ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
          </section>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">
            <Save size={15} />
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
