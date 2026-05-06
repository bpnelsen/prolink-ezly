'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '../../../../lib/supabase-client';
import Breadcrumbs from '../../../../components/Breadcrumbs';

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    notes: '',
  });

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (data) {
        setForm({
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          address_line1: data.address_line1 ?? '',
          address_line2: data.address_line2 ?? '',
          city: data.city ?? '',
          state: data.state ?? '',
          zip_code: data.zip_code ?? '',
          notes: data.notes ?? '',
        });
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) return;
    setSaving(true);
    setError('');

    const { error: updateError } = await supabase
      .from('clients')
      .update({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address_line1: form.address_line1.trim() || null,
        address_line2: form.address_line2.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zip_code: form.zip_code.trim() || null,
        notes: form.notes.trim() || null,
      })
      .eq('id', id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push(`/customers/${id}`), 1500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }, { label: 'Edit', href: '#' }]} />
        <div className="max-w-3xl mx-auto p-4 md:p-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-teal-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">Changes Saved!</p>
            <p className="text-gray-500 text-sm mt-2">Redirecting to customer details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[
        { label: 'Customers', href: '/customers' },
        { label: `${form.first_name} ${form.last_name}`, href: `/customers/${id}` },
        { label: 'Edit', href: '#' },
      ]} />
      <div className="max-w-3xl mx-auto p-4 md:p-8">

        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-200 transition">
            <ArrowLeft size={16} className="text-gray-500" />
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Customer Hub</p>
            <h1 className="text-2xl font-bold text-gray-900">Edit Customer</h1>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

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
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address Line 1</label>
                <input value={form.address_line1} onChange={handleChange('address_line1')}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="123 Main St" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address Line 2</label>
                <input value={form.address_line2} onChange={handleChange('address_line2')}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="Apt, Suite, Unit..." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">City</label>
                  <input value={form.city} onChange={handleChange('city')}
                    className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                    placeholder="Salt Lake City" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">State</label>
                  <input value={form.state} onChange={handleChange('state')} maxLength={2}
                    className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                    placeholder="UT" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">ZIP</label>
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
            <button type="submit" disabled={saving || !form.first_name.trim() || !form.last_name.trim()}
              className="flex-1 py-3.5 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition shadow-sm disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
