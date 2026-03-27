'use client'
import { useState } from 'react';
import { Phone, Mail, MapPin, Search, Plus, Filter, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import Breadcrumbs from '../../components/Breadcrumbs';

const CUSTOMERS = [
  { id: 1, name: 'Brian Nelsen', phone: '(801) 555-0101', email: 'brian@example.com', address: '123 Main St, SLC', jobs: 4, total: '$12,400' },
  { id: 2, name: 'Sarah Connor', phone: '(801) 555-0102', email: 'sarah@example.com', address: '456 Oak Dr, SLC', jobs: 2, total: '$8,200' },
  { id: 3, name: 'John Smith', phone: '(801) 555-0103', email: 'jsmith@example.com', address: '789 Pine Ct, SLC', jobs: 1, total: '$2,100' },
];

export default function CustomersPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-700">
      <nav className="border-b border-gray-200 p-4 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Prolink <span className="font-light text-gray-500">by Ezly</span></h1>
          <Link href="/customers/new" className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition shadow-sm">
            <Plus size={16} /> New Customer
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }]} />
        
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Customer Hub</h2>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input className="bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all" placeholder="Search customers..." />
            </div>
            <Link href="/customers/new" className="bg-white border border-gray-200 text-gray-700 hover:text-teal-600 hover:border-teal-500 px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all">
              <Plus size={16} /> New Customer
            </Link>
          </div>
        </header>

        <div className="card overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-right">Lifetime Value</th>
                <th className="px-6 py-4 text-center">Jobs</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {CUSTOMERS.map(c => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">{c.name}</td>
                  <td className="px-6 py-4 text-gray-600">
                    <p className="flex items-center gap-2"><Phone size={12}/> {c.phone}</p>
                    <p className="flex items-center gap-2 mt-1"><Mail size={12}/> {c.email}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600 flex items-center gap-2"><MapPin size={12}/> {c.address}</td>
                  <td className="px-6 py-4 font-bold text-teal-600 text-right">{c.total}</td>
                  <td className="px-6 py-4 text-center font-bold text-gray-900">{c.jobs}</td>
                  <td className="px-6 py-4 text-right"><MoreHorizontal className="text-gray-400 hover:text-gray-900 cursor-pointer" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
