'use client'
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import Breadcrumbs from '../../components/Breadcrumbs';
import { supabase } from '../../lib/supabase-client';

export default function NewJob() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id');

  const [loading, setLoading] = useState(false);
  const [prefilling, setPrefilling] = useState(!!clientId);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    address: '',
    trade: '',
    description: '',
    scheduledDate: '',
    estimatedPrice: '',
  });

  useEffect(() => {
    if (!clientId) return;
    const fetchClient = async () => {
      const { data } = await supabase
        .from('clients')
        .select('first_name, last_name, phone, email, address_line1, address_line2')
        .eq('id', clientId)
        .single();

      if (data) {
        const address = [data.address_line1, data.address_line2].filter(Boolean).join(', ');
        setForm(prev => ({
          ...prev,
          customerName: `${data.first_name} ${data.last_name}`.trim(),
          phone: data.phone ?? '',
          email: data.email ?? '',
          address: address,
        }));
      }
      setPrefilling(false);
    };
    fetchClient();
  }, [clientId]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.address.trim()) return;
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in to create a job.');
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from('pl_pipelines').insert({
        contractor_id: session.user.id,
        project_name: `${form.customerName} — ${form.trade || 'General'}`,
        stage: 'Lead',
        value: form.estimatedPrice ? parseFloat(form.estimatedPrice) : 0,
        deadline: form.scheduledDate || null,
      });

      if (insertError) throw insertError;

      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        if (clientId) {
          router.push(`/customers/${clientId}/jobs`);
        } else {
          router.push('/dashboard');
        }
      }, 1500);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Error creating job');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="card p-12 bg-white text-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-teal-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">Job Created!</p>
            <p className="text-gray-500 text-sm mt-2">
              {clientId ? 'Redirecting to client jobs...' : 'Redirecting to Dashboard...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (prefilling) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={[{ label: 'New Job', href: '/new-job' }]} />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="card p-8 bg-white">
          <h2 className="text-2xl font-bold mb-8 text-gray-900">Create New Job</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Customer Info */}
            <div className="space-y-4">
              <h3 className="font-bold text-teal-600">Customer Details</h3>
              <input
                value={form.customerName}
                onChange={handleChange('customerName')}
                required
                className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                placeholder="Full Name *"
              />
              <input
                value={form.phone}
                onChange={handleChange('phone')}
                type="tel"
                className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                placeholder="Phone Number"
              />
              <input
                value={form.email}
                onChange={handleChange('email')}
                type="email"
                className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                placeholder="Email Address"
              />
            </div>

            {/* Job Specs */}
            <div className="space-y-4">
              <h3 className="font-bold text-teal-600">Job Specifications</h3>
              <input
                value={form.address}
                onChange={handleChange('address')}
                required
                className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                placeholder="Job Site Address *"
              />
              <select
                value={form.trade}
                onChange={handleChange('trade')}
                className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">Select Trade</option>
                <option value="Kitchen Remodel">Kitchen Remodel</option>
                <option value="Deck Build">Deck Build</option>
                <option value="Bath Reno">Bath Reno</option>
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="HVAC">HVAC</option>
                <option value="Roofing">Roofing</option>
              </select>
              <textarea
                value={form.description}
                onChange={handleChange('description')}
                className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 h-24 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                placeholder="Scope of Work / Project Description"
              />
            </div>

            {/* Financial/Timing */}
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-200">
              <h3 className="font-bold text-teal-600">Scheduling & Initial Quote</h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  value={form.scheduledDate}
                  onChange={handleChange('scheduledDate')}
                  className="bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
                <input
                  value={form.estimatedPrice}
                  onChange={handleChange('estimatedPrice')}
                  type="number"
                  min="0"
                  step="0.01"
                  className="bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="Estimated Price ($)"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !form.customerName.trim() || !form.address.trim()}
            className="w-full mt-8 bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-700 transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Job'}
          </button>
        </form>
      </div>
    </div>
  );
}
