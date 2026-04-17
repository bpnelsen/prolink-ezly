'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import Breadcrumbs from '../../../components/Breadcrumbs';

export default function NewCustomer() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    street_address: '', city: '', zip_code: '', notes: ''
  });

  const handleCreate = async () => {
    alert("Button is working!");
    /*
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    ... */
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-3xl mx-auto">
        <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }, { label: 'New Customer', href: '/customers/new' }]} />
        
        <div className="card p-8 bg-white">
          <h2 className="text-2xl font-bold mb-8 text-gray-900">Add New Customer</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-bold text-teal-600">Personal Details</h3>
              <input name="first_name" onChange={handleChange} className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200" placeholder="First Name" />
              <input name="last_name" onChange={handleChange} className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200" placeholder="Last Name" />
              <input name="phone" onChange={handleChange} className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200" placeholder="Phone Number" />
              <input name="email" onChange={handleChange} className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200" placeholder="Email Address" />
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-teal-600">Primary Property</h3>
              <input name="street_address" onChange={handleChange} className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200" placeholder="Street Address" />
              <div className="grid grid-cols-2 gap-4">
                 <input name="city" onChange={handleChange} className="bg-gray-50 p-3 rounded-lg border border-gray-200" placeholder="City" />
                 <input name="zip_code" onChange={handleChange} className="bg-gray-50 p-3 rounded-lg border border-gray-200" placeholder="Zip Code" />
              </div>
              <textarea name="notes" onChange={handleChange} className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 h-28" placeholder="Notes (Gate codes, pet info, etc.)" />
            </div>
          </div>
          
          <button 
            type="button"
            onClick={handleCreate} 
            disabled={loading}
            className="w-full mt-8 bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-700 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? 'Creating...' : <><Plus size={18}/> Create Customer Profile</>}
          </button>
        </div>
      </div>
    </div>
  );
}
