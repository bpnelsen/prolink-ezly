'use client'
import { useState } from 'react';
import { Plus } from 'lucide-react';
import Breadcrumbs from '../../../components/Breadcrumbs';

export default function NewCustomer() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-3xl mx-auto">
        <Breadcrumbs items={[{ label: 'Customers', href: '/customers' }, { label: 'New Customer', href: '/customers/new' }]} />
        
        <div className="card p-8 bg-white">
          <h2 className="text-2xl font-bold mb-8 text-gray-900">Add New Customer</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-bold text-teal-600">Personal Details</h3>
              <input className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="First Name" />
              <input className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="Last Name" />
              <input className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="Phone Number" />
              <input className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="Email Address" />
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-teal-600">Primary Property</h3>
              <input className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="Street Address" />
              <div className="grid grid-cols-2 gap-4">
                 <input className="bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="City" />
                 <input className="bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="Zip Code" />
              </div>
              <textarea className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 h-28 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="Notes (Gate codes, pet info, etc.)" />
            </div>
          </div>
          
          <button className="w-full mt-8 bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-700 transition-all flex items-center justify-center gap-2 shadow-sm">
            <Plus size={18}/> Create Customer Profile
          </button>
        </div>
      </div>
    </div>
  );
}
