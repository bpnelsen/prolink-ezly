import { useState, useEffect } from 'react';
import { Phone, Star, ShieldCheck, UserPlus, FileText, AlertTriangle } from 'lucide-react';
import { fetchContractors, type Contractor } from '../lib/data-service';

export default function ContractorCRM() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchContractors();
      setContractors(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Loading sub-contractors...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Trust Scores</h2>
        <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-sm">
          <UserPlus size={16} />
          Invite Sub
        </button>
      </div>
      
      <div className="grid gap-4">
        {contractors.map((c) => (
          <div key={c.id} className="card p-5 hover:border-teal-300 transition duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-gray-900">{c.name}</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mt-1">{c.trade}</p>
              </div>
              <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-[10px] font-bold border border-emerald-200">
                <ShieldCheck size={12} /> 98%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[9px] uppercase text-gray-500 tracking-wider">On-Time</p>
                <p className="font-bold text-gray-700 mt-1">95%</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[9px] uppercase text-gray-500 tracking-wider">Invoice</p>
                <p className="font-bold text-gray-700 mt-1">100%</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 text-xs border border-gray-200 hover:border-teal-500 text-gray-600 hover:text-teal-600 px-3 py-2.5 rounded-lg font-bold transition">
                Full Vetting
              </button>
              <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-2.5 rounded-lg font-bold transition flex items-center justify-center gap-1">
                <FileText size={14} />
                Assign
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
