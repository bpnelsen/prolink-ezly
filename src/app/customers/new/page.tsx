'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, CheckCircle2 } from 'lucide-react';
import Breadcrumbs from '../../../components/Breadcrumbs';
import { apiClient } from '../../../lib/api-client';

export default function NewCustomer() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    street_address: '',
    city: '',
    zip_code: '',
    notes: '',
  });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) return;
    setLoading(true);

    try {
      // Map UI fields to backend expected fields
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address_line1: form.street_address.trim() || undefined,
        city: form.city.trim() || undefined,
        zip_code: form.zip_code.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };

      await apiClient('/api/v1/clients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setLoading(false);
      setSuccess(true);
      setTimeout(() => router.push('/customers'), 1500);
    } catch (err: any) {
      setLoading(false);
      alert('Error creating customer: ' + err.message);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }, { label: 'New Customer', href: '/customers/new' }]} />
        <div className="max-w-3xl mx-auto p-4 md:p-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-teal-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">Customer Added!</p>
            <p className="text-gray-500 text-sm mt-2">Redirecting to Customer Hub...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }, { label: 'New Customer', href: '/customers/new' }]} />
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Customer Hub</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Add New Customer</h2>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide">Personal Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">First Name *</label>
                  <input required value={form.first_name} onChange={handleChange('first_name')}
                    className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                    placeholder="John" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Last Name *</label>
                  <input required value={form.last_name} onChange={handleChange('last_name')}
                    className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                    placeholder="Smith" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
                <input value={form.phone} onChange={handleChange('phone')} type="tel"
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="(801) 555-0100" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                <input value={form.email} onChange={handleChange('email')} type="email"
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="customer@example.com" />
              </div>
            </div>

            <div className="space-y-5">
              <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide">Primary Property</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Street Address</label>
                <input value={form.street_address} onChange={handleChange('street_address')}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="123 Main St" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">City</label>
                  <input value={form.city} onChange={handleChange('city')}
                    className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                    placeholder="Salt Lake City" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Zip Code</label>
                  <input value={form.zip_code} onChange={handleChange('zip_code')}
                    className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                    placeholder="84101" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={handleChange('notes')} rows={4}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition resize-none"
                  placeholder="Gate codes, pet info, special instructions..." />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8 max-w-md">
            <button type="button" onClick={() => router.back()}
              className="flex-1 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading || !form.first_name.trim() || !form.last_name.trim()}
              className="flex-1 py-3.5 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">
              <Plus size={15} />
              {loading ? 'Saving...' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
