'use client'
import { Settings, Zap, Lock, Palette } from 'lucide-react';
import Link from 'next/link';

export default function EnterpriseSettings() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Enterprise Settings</h1>
      
      <div className="grid gap-4">
        {/* Automations */}
        <div className="card p-6 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg text-purple-600"><Zap size={20} /></div>
            <div>
              <p className="font-bold text-gray-900">Automations</p>
              <p className="text-sm text-gray-500">Configure workflow triggers and SMS/Email automation.</p>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="card p-6 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg text-red-600"><Lock size={20} /></div>
            <div>
              <p className="font-bold text-gray-900">Access & Security</p>
              <p className="text-sm text-gray-500">Manage team roles and system access.</p>
            </div>
          </div>
        </div>

        {/* Design */}
        <div className="card p-6 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600"><Palette size={20} /></div>
            <div>
              <p className="font-bold text-gray-900">Design & Theme</p>
              <p className="text-sm text-gray-500">Customize your business branding.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
