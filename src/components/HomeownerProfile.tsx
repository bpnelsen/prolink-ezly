'use client'
import { useState } from 'react';
import { User, Mail, Phone, MapPin, Save, Camera } from 'lucide-react';

export default function HomeownerProfile() {
  const [profile, setProfile] = useState({
    name: 'Brian Nelsen',
    email: 'brian@example.com',
    phone: '(801) 555-0123',
    address: '123 Main St, SLC, UT 84101',
  });

  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    // In prod, call Supabase here:
    // await supabase.from('profiles').update(profile).eq('id', userId);
    setTimeout(() => setSaving(false), 1000);
  };

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><User size={18} /> My Information</h3>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded hover:bg-teal-700 flex items-center gap-1"
          >
            <Save size={12} /> {saving ? 'Saving...' : 'Save Info'}
          </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xl border-2 border-teal-200 cursor-pointer hover:bg-teal-200">BN</div>
            <button className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"><Camera size={12}/> Change Photo</button>
        </div>

        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
            <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded text-gray-900 focus:border-teal-500" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded text-gray-900" />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                <input type="tel" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded text-gray-900" />
            </div>
        </div>

        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Property Address</label>
            <textarea value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded text-gray-900" rows={2} />
        </div>
      </div>
    </div>
  );
}
