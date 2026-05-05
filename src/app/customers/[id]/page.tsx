'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Phone, Mail, MapPin, FileText, ArrowLeft, Pencil, Trash2, User, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase-client';
import Breadcrumbs from '../../../components/Breadcrumbs';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  notes: string | null;
  created_at: string;
  contractor_id: string;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className="text-sm text-gray-900">{value || <span className="text-gray-300 italic">Not provided</span>}</p>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setCustomer(data);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Archive this customer? They will be hidden from your list.')) return;
    await supabase.from('clients').update({ is_deleted: true }).eq('id', id);
    router.push('/customers');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !customer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }, { label: 'Not Found', href: '#' }]} />
        <div className="max-w-3xl mx-auto p-8 text-center">
          <p className="text-gray-500 font-medium">Customer not found.</p>
          <Link href="/customers" className="text-teal-600 text-sm mt-2 inline-block hover:text-teal-700">← Back to Customer Hub</Link>
        </div>
      </div>
    );
  }

  const fullName = `${customer.first_name} ${customer.last_name}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }, { label: fullName, href: '#' }]} />
      <main className="max-w-3xl mx-auto p-4 md:p-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-200 transition">
              <ArrowLeft size={16} className="text-gray-500" />
            </button>
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
              <User size={22} className="text-teal-600" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Customer</p>
              <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/customers/${id}/jobs`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-teal-200 text-sm font-semibold text-teal-700 hover:bg-teal-50 transition"
            >
              <Briefcase size={13} /> View Jobs
            </Link>
            <Link
              href={`/customers/${id}/edit`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
            >
              <Pencil size={13} /> Edit
            </Link>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition"
            >
              <Trash2 size={13} /> Archive
            </button>
          </div>
        </div>

        <div className="space-y-4">

          {/* Contact Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Phone size={15} className="text-teal-600 mt-0.5 shrink-0" />
                <Field label="Phone" value={customer.phone} />
              </div>
              <div className="flex items-start gap-3">
                <Mail size={15} className="text-teal-600 mt-0.5 shrink-0" />
                <Field label="Email" value={customer.email} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Property Address</h2>
            <div className="flex items-start gap-3">
              <MapPin size={15} className="text-teal-600 mt-0.5 shrink-0" />
              <div className="space-y-4">
                <Field label="Address Line 1" value={customer.address_line1} />
                <Field label="Address Line 2" value={customer.address_line2} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start gap-3">
              <FileText size={15} className="text-teal-600 mt-0.5 shrink-0" />
              <div className="w-full">
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Notes</h2>
                {customer.notes
                  ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
                  : <p className="text-sm text-gray-300 italic">No notes added.</p>
                }
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Record Info</h2>
            <Field
              label="Customer Since"
              value={new Date(customer.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            />
          </div>

        </div>
      </main>
    </div>
  );
}
