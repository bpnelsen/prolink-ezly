'use client'
import { useState } from 'react';
import { Bell, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotificationsSettings() {
  const [prefs, setPrefs] = useState({
    sms: true,
    email: true,
    updates: false,
  });

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/settings" className="text-sm text-gray-500 hover:text-teal-600 flex items-center gap-1 mb-6">
          <ArrowLeft size={14} /> Back to Settings
        </Link>
        <div className="card p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Bell size={20} /> Notification Settings</h1>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={prefs.sms} onChange={() => setPrefs({...prefs, sms: !prefs.sms})} className="h-4 w-4 accent-teal-600" />
              <span className="text-sm text-gray-700">Enable SMS Notifications</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={prefs.email} onChange={() => setPrefs({...prefs, email: !prefs.email})} className="h-4 w-4 accent-teal-600" />
              <span className="text-sm text-gray-700">Enable Email Notifications</span>
            </label>
            <button className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 mt-4">Save Preferences</button>
          </div>
        </div>
      </div>
    </div>
  );
}
