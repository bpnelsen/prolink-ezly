'use client'
import { useState } from 'react';
import { MapPin, Phone, MessageSquare, Clock, DollarSign, CheckCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import FinancialsTab from '../components/FinancialsTab';
import WorkflowEngine from '../components/WorkflowEngine';

export default function JobDetailHub() {
  const [activeTab, setActiveTab] = useState('Workflow');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-700">
      <nav className="border-b border-gray-200 p-4 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between font-bold">
           <div className="flex gap-4">
              <Link href="/dashboard" className="text-gray-900 hover:text-teal-600 transition-colors">← Back to Dashboard</Link>
              <span className="text-gray-300">|</span>
              <span className="text-teal-600">123 Main St — Kitchen Remodel</span>
           </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Context (Static) */}
        <div className="md:col-span-4 space-y-6">
           <div className="card p-6">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Customer Info</h2>
              <div className="space-y-4">
                 <p className="text-lg font-bold text-gray-900">Brian Nelsen</p>
                 <div className="flex items-center gap-2 text-sm text-gray-500"><Phone size={16}/> (801) 555-0101</div>
                 <div className="flex items-center gap-2 text-sm text-gray-500"><MapPin size={16}/> 123 Main St, Salt Lake City</div>
                 <button className="w-full mt-2 bg-gray-100 text-gray-700 font-semibold text-xs py-2 rounded-lg hover:bg-gray-200 transition-colors">View History (4 Jobs)</button>
              </div>
           </div>
           
           <div className="card h-48 flex items-center justify-center text-gray-400 border-dashed border-2">
              Job Location Map Placeholder
           </div>

           <div className="card p-6">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Job Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="font-semibold text-gray-900">Kitchen Remodel</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="font-semibold text-gray-900">Mar 24, 2026</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Priority</span>
                  <span className="text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Normal</span>
                </div>
              </div>
           </div>
        </div>

        {/* Right Column: Workflow Engine (Dynamic) */}
        <div className="md:col-span-8 space-y-6">
           <div className="card p-6">
              {/* Tab Navigation */}
              <div className="flex gap-6 mb-8 border-b border-gray-200 pb-4">
                {['Workflow', 'Financials', 'Docs'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`text-xs font-bold uppercase tracking-widest pb-2 border-b-2 transition-colors ${activeTab === tab ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:text-gray-900'}`}
                    >
                        {tab}
                    </button>
                ))}
              </div>

              {/* Dynamic Content */}
              {activeTab === 'Workflow' && <WorkflowEngine />}
              {activeTab === 'Financials' && <FinancialsTab />}
              {activeTab === 'Docs' && (
                <div className="text-center py-12">
                  <FileText size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="font-semibold text-gray-500">No documents yet</p>
                  <p className="text-sm text-gray-400 mt-1">Contracts, photos, and files will appear here.</p>
                </div>
              )}
           </div>
        </div>

      </main>
    </div>
  );
}
