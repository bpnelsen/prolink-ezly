import { useState } from 'react';
import { Sparkles, CheckCircle, Clock } from 'lucide-react';

const INITIAL_CONTRACTORS = [
  { id: 1, name: 'AAA Electric', trade: 'Electrician', rating: 4.8, reviews: 120, status: 'Vetted', phone: '(801) 555-0101' },
  { id: 2, name: 'Reliable Plumbing', trade: 'Plumber', rating: 4.2, reviews: 45, status: 'New', phone: '(801) 555-0102' },
  { id: 3, name: 'Precision Roofing', trade: 'Roofer', rating: 4.9, reviews: 88, status: 'New', phone: '(801) 555-0103' },
  { id: 4, name: 'Quick Fix HVAC', trade: 'HVAC', rating: 4.6, reviews: 60, status: 'New', phone: '(801) 555-0104' },
];

export default function VettingEngine() {
  const [contractors, setContractors] = useState(INITIAL_CONTRACTORS);

  const runVetting = () => {
    const updated = contractors.map(c => {
      if (c.status === 'New' && c.rating >= 4.5 && c.reviews >= 50) {
        return { ...c, status: 'Vetted' };
      }
      return c;
    });
    setContractors(updated);
  };

  const pendingCount = contractors.filter(c => c.status === 'New').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Vetting Hub</h2>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Automated Quality Assurance</p>
        </div>
        <button 
          onClick={runVetting}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm"
        >
          <Sparkles size={16} />
        </button>
      </div>

      <div className="flex items-center gap-4 p-4 bg-teal-50 rounded-xl border border-teal-200">
        <Clock size={20} className="text-teal-600" />
        <div>
          <p className="text-sm font-bold text-teal-700">{pendingCount} Waiting for Review</p>
          <p className="text-[10px] text-teal-600 font-semibold tracking-wider uppercase">Rating ≥ 4.5 & Reviews ≥ 50</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {contractors.filter(c => c.status === 'New').map(c => (
          <div key={c.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-gray-50">
            <div>
              <p className="text-xs font-bold text-gray-700">{c.name}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{c.rating} Stars • {c.reviews} Reviews</p>
            </div>
            <div className="h-4 w-4 rounded-full border border-gray-300" />
          </div>
        ))}
        {pendingCount === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <CheckCircle size={32} className="mb-2 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">All Pros Vetted!</p>
          </div>
        )}
      </div>
    </div>
  );
}
