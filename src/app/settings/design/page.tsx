'use client'
import { useState } from 'react'
import { Palette, CheckCircle2 } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'

export default function DesignPage() {
  const [saved, setSaved] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#0f3a7d')
  const [accentColor, setAccentColor] = useState('#14b8a6')

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Design & Theme', href: '/settings/design' }]} />
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Settings</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Palette size={22} className="text-teal-600" /> Design &amp; Theme
        </h2>
        <p className="text-gray-500 text-sm mb-8">Customize your branding colors and appearance.</p>

        {saved && (
          <div className="flex items-center gap-3 mb-6 p-4 bg-teal-50 text-teal-700 rounded-xl text-sm font-semibold">
            <CheckCircle2 size={16} /> Theme preferences saved!
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm font-mono"
                  placeholder="#0f3a7d"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm font-mono"
                  placeholder="#14b8a6"
                />
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview</p>
              <div className="flex gap-3">
                <div className="px-4 py-2 rounded-lg text-white text-sm font-bold" style={{ backgroundColor: primaryColor }}>
                  Primary Button
                </div>
                <div className="px-4 py-2 rounded-lg text-white text-sm font-bold" style={{ backgroundColor: accentColor }}>
                  Accent Button
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="py-3 px-6 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition shadow-sm flex items-center gap-2"
            >
              <Palette size={15} />
              Save Theme
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
