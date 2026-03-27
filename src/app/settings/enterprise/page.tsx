'use client'
import { useState } from 'react';
import { Settings, Save, Building, Clock, Map, UserPlus, CreditCard } from 'lucide-react';
import Breadcrumbs from '../../../components/Breadcrumbs';

export default function SettingsEnterprise() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#333333] p-8">
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Enterprise Config', href: '/settings/enterprise' }]} />
        
        <header className="mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Building className="text-[#00bfa5]" /> Enterprise Configuration
          </h2>
          <p className="text-sm text-gray-500 mt-2">Scale your business logic, service boundaries, and financial integrations.</p>
        </header>

        <div className="grid gap-6">
          {/* Service Area */}
          <div className="card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Map size={18} className="text-[#00bfa5]"/> Service Territory</h3>
            <div className="grid grid-cols-2 gap-4">
               <input className="p-3 border border-gray-200 rounded-lg" placeholder="Default Service Radius (miles)" />
               <input className="p-3 border border-gray-200 rounded-lg" placeholder="Restricted Postal Codes" />
            </div>
          </div>

          {/* Business Hours */}
          <div className="card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Clock size={18} className="text-[#00bfa5]"/> Business Operational Hours</h3>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span>Monday - Friday</span>
                    <input type="time" defaultValue="08:00" /> to <input type="time" defaultValue="17:00" />
                </div>
                <div className="flex justify-between items-center py-2">
                    <span>Saturday</span>
                    <input type="time" defaultValue="09:00" /> to <input type="time" defaultValue="13:00" />
                </div>
            </div>
          </div>

          {/* Financial Integration */}
          <div className="card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2"><CreditCard size={18} className="text-[#00bfa5]"/> Financial Integration</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                    <span>QuickBooks Online API</span>
                    <button className="bg-gray-800 text-[#1a1a1a] px-4 py-1 rounded text-xs font-bold">Connect</button>
                </div>
                <div className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                    <span>Stripe Payouts</span>
                    <button className="bg-gray-800 text-[#1a1a1a] px-4 py-1 rounded text-xs font-bold">Configure</button>
                </div>
            </div>
          </div>
        </div>

        <button className="w-full mt-8 bg-[#00bfa5] text-[#1a1a1a] font-bold py-4 rounded-xl hover:bg-[#00a896] transition flex items-center justify-center gap-2">
          <Save size={18}/> Apply Enterprise Configuration
        </button>
      </div>
    </div>
  );
}
