import { useState } from 'react';
import { Settings, Wrench } from 'lucide-react';

const CONTRACTORS = [
  { id: 1, name: 'AAA Electric', trade: 'Electrician', status: 'Active', onTime: 98 },
  { id: 2, name: 'Reliable Plumbing', trade: 'Plumber', status: 'Available', onTime: 92 },
  { id: 3, name: 'Precision Roofing', trade: 'Roofer', status: 'On Break', onTime: 85 },
];

export default function ContractorPipeline() {
  const [contractors] = useState(CONTRACTORS);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Dispatch Pipeline</h2>
        <button className="text-gray-400 hover:text-teal-600 transition-colors">
            <Settings size={18} />
        </button>
      </div>

      <div className="grid gap-3">
        {contractors.map((c) => (
          <div key={c.id} className="card p-5 hover:border-teal-300 transition duration-300 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-teal-50 rounded-lg text-teal-600 border border-teal-200">
                  <Wrench size={20} />
               </div>
               <div>
                  <p className="font-bold text-gray-900">{c.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mt-0.5">{c.trade}</p>
               </div>
            </div>
            
            <div className="text-right">
              <span className="block text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-1">{c.status}</span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">{c.onTime}% On-Time</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
