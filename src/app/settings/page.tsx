'use client'
import { Settings, Zap, User, Lock, Palette, Bell, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Breadcrumbs from '../../components/Breadcrumbs';

export default function SettingsPage() {
  const settingsOptions = [
    { title: 'Profile', desc: 'Manage your business details', href: '/settings/profile', icon: User },
    { title: 'Automations', desc: 'Configure workflow triggers', href: '/automations', icon: Zap },
    { title: 'Access & Security', desc: 'Manage team and permissions', href: '/settings/security', icon: Lock },
    { title: 'Design & Theme', desc: 'Custom branding and colors', href: '/settings/design', icon: Palette },
    { title: 'Notifications', desc: 'Manage alerts and alerts', href: '/settings/notifications', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#333333] p-8">
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }]} />
        
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-[#1a1a1a] flex items-center gap-3">
            <Settings className="text-cyan-500" /> Settings
          </h2>
          <p className="text-sm text-gray-500 mt-2">Manage your Prolink by Ezly operations.</p>
        </header>

        <div className="grid gap-2">
            {settingsOptions.map((opt) => (
                <Link key={opt.title} href={opt.href} className="bg-white p-6 rounded-xl border border-gray-100 hover:border-[#00bfa5] transition flex items-center justify-between">
                   <div className="flex items-center gap-4">
                       <div className="p-3 bg-gray-800 rounded-lg text-gray-500">
                           <opt.icon size={20} />
                       </div>
                       <div>
                           <p className="font-bold text-[#1a1a1a]">{opt.title}</p>
                           <p className="text-xs text-gray-500">{opt.desc}</p>
                       </div>
                   </div>
                   <ChevronRight className="text-gray-600" />
                </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
