'use client'
import { useState } from 'react';
import Breadcrumbs from '../../components/Breadcrumbs';

export default function NewJob() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={[{ label: 'New Job', href: '/new-job' }]} />
        <div className="card p-8 bg-white">
          <h2 className="text-2xl font-bold mb-8 text-gray-900">Create New Job</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Customer Info */}
            <div className="space-y-4">
              <h3 className="font-bold text-teal-600">Customer Details</h3>
              <input className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="Full Name" />
              <input className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="Phone Number" />
              <input className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="Email Address" />
            </div>

            {/* Job Specs */}
            <div className="space-y-4">
              <h3 className="font-bold text-teal-600">Job Specifications</h3>
              <input className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="Job Site Address" />
              <select className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                 <option>Select Trade</option>
                 <option>Kitchen Remodel</option>
                 <option>Deck Build</option>
                 <option>Bath Reno</option>
              </select>
              <textarea className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 h-24 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="Scope of Work / Project Description" />
            </div>

            {/* Financial/Timing */}
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-200">
              <h3 className="font-bold text-teal-600">Scheduling & Initial Quote</h3>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" className="bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
                <input className="bg-gray-50 p-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="Estimated Price ($)" />
              </div>
            </div>
          </div>
          
          <button className="w-full mt-8 bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-700 transition-all shadow-sm">
            Create Job Bucket
          </button>
        </div>
      </div>
    </div>
  );
}
