'use client'
import { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, Search, Plus, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase-client';
import Breadcrumbs from '../../components/Breadcrumbs';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  street_address: string | null;
  city: string | null;
  zip_code: string | null;
  notes: string | null;
  created_at: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('pl_customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setCustomers(data);
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const filtered = customers.filter(c =>
    !search ||
    c.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }]} />
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Prolink CRM</p>
            <h2 className="text-2xl font-bold text-gray-900">Customer Hub</h2>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all w-64"
                placeholder="Search by name, email, phone..."
              />
            </div>
            <Link
              href="/customers/new"
              className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition shadow-sm"
            >
              <Plus size={15} /> New Customer
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500 font-medium text-lg">
              {search ? 'No customers match your search.' : 'No customers yet.'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {search ? 'Try a different search term.' : 'Add your first customer to get started.'}
            </p>
            {!search && (
              <Link href="/customers/new" className="inline-flex items-center gap-2 mt-4 text-teal-600 font-semibold text-sm hover:text-teal-700">
                <Plus size={14} /> Add First Customer
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold text-right">Added</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{c.first_name} {c.last_name}</p>
                      {c.notes && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{c.notes}</p>}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {c.phone && <p className="flex items-center gap-2 text-sm"><Phone size={11}/> {c.phone}</p>}
                      {c.email && <p className="flex items-center gap-2 text-sm mt-1"><Mail size={11}/> {c.email}</p>}
                      {!c.phone && !c.email && <p className="text-gray-300 text-xs">No contact info</p>}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {c.street_address ? (
                        <p className="flex items-center gap-2"><MapPin size={11}/> {c.street_address}{c.city ? `, ${c.city}` : ''}{c.zip_code ? ` ${c.zip_code}` : ''}</p>
                      ) : (
                        <p className="text-gray-300 text-xs">No address</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-gray-400">
                      {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <MoreHorizontal className="text-gray-400 hover:text-gray-700 cursor-pointer ml-auto" size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
