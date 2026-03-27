'use client'
import { useState } from 'react';
import { Zap, Plus, Settings, ArrowRight, Clock, MessageSquare, CheckCircle } from 'lucide-react';
import Breadcrumbs from '../../components/Breadcrumbs';

const AUTOMATIONS = [
  { id: 1, name: 'Follow up on Quote', trigger: 'Quote Sent', action: 'SMS Reminder after 2 days', active: true },
  { id: 2, name: 'Material Arrival Alert', trigger: 'Status: Start', action: 'Notify Team via SMS', active: true },
  { id: 3, name: 'Payment Reminder', trigger: 'Invoice Overdue', action: 'Auto-email Client', active: false },
];

export default function AutomationsPage() {
  const [rules, setRules] = useState(AUTOMATIONS);

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#333333] p-8">
      <div className="max-w-5xl mx-auto">
        <Breadcrumbs items={[{ label: 'Automations Engine', href: '/automations' }]} />
        
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#1a1a1a]">Automation Engine</h2>
            <p className="text-sm text-gray-500">Define business triggers to scale your operations.</p>
          </div>
          <button className="bg-[#00bfa5] hover:bg-cyan-500 text-black px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
            <Plus size={16} /> New Rule
          </button>
        </header>

        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center justify-between hover:border-[#00bfa5] transition">
              <div className="flex items-center gap-6">
                <div className={`p-3 rounded-xl ${rule.active ? 'bg-green-50 text-[#00bfa5]' : 'bg-gray-800 text-gray-500'}`}>
                    <Zap size={20} />
                </div>
                <div>
                   <h4 className="font-bold text-[#1a1a1a]">{rule.name}</h4>
                   <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-wider">
                       <span>{rule.trigger}</span>
                       <ArrowRight size={10} />
                       <span>{rule.action}</span>
                   </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                 <button className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest ${rule.active ? 'bg-green-50 text-[#00bfa5]' : 'bg-gray-800 text-gray-500'}`}>
                    {rule.active ? 'Enabled' : 'Disabled'}
                 </button>
                 <Settings className="text-gray-600 hover:text-[#1a1a1a] cursor-pointer" size={18} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
