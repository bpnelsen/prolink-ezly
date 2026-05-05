'use client'
import { useState } from 'react'
import { Lock, Shield, Key, CheckCircle2 } from 'lucide-react'
import Breadcrumbs from '../../../components/Breadcrumbs'
import { supabase } from '../../../lib/supabase-client'

export default function SecurityPage() {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setSaved(false)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    if (form.newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password: form.newPassword })
    setLoading(false)
    if (updateError) {
      setError(updateError.message || 'Failed to update password.')
    } else {
      setSaved(true)
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Access & Security', href: '/settings/security' }]} />
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Settings</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Lock size={22} className="text-teal-600" /> Access &amp; Security
        </h2>
        <p className="text-gray-500 text-sm mb-8">Manage your password and account security settings.</p>

        {saved && (
          <div className="flex items-center gap-3 mb-6 p-4 bg-teal-50 text-teal-700 rounded-xl text-sm font-semibold">
            <CheckCircle2 size={16} /> Password updated successfully!
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-8">
          {/* Change Password */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Key size={16} className="text-gray-400" />
              <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide">Change Password</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={handleChange('newPassword')}
                  placeholder="At least 8 characters"
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  placeholder="Repeat new password"
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !form.newPassword || !form.confirmPassword}
                className="py-3 px-6 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                <Shield size={15} />
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Sessions Info */}
          <div className="border-t border-gray-100 pt-8">
            <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-4">Active Sessions</h3>
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
              <p className="font-semibold text-gray-900 mb-1">Current Session</p>
              <p className="text-xs text-gray-400">Signed in on this device. To sign out of all devices, use the logout button in your dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
