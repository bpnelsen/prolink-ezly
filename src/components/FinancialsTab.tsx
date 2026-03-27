import { useState } from 'react';
import { DollarSign, Plus, Trash2, FileText, TrendingUp, AlertTriangle } from 'lucide-react';

export default function FinancialsTab() {
  const [items, setItems] = useState([
    { id: 1, desc: 'Labor - Cabinet Demolition', qty: 1, rate: 450.00, actual: 450.00 },
    { id: 2, desc: 'Materials - Subway Tile', qty: 12, rate: 15.50, actual: 18.25 },
  ]);

  const subtotalEstimate = items.reduce((acc, item) => acc + (item.qty * item.rate), 0);
  const subtotalActual = items.reduce((acc, item) => acc + (item.qty * item.actual), 0);
  const variance = subtotalEstimate - subtotalActual;

  return (
    <div className="space-y-6">
      
      {/* Enterprise Financial Health KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p className="text-[9px] text-gray-500 uppercase font-semibold">Estimated Profit</p>
          <p className="font-bold text-gray-900">${subtotalEstimate.toFixed(2)}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p className="text-[9px] text-gray-500 uppercase font-semibold">Actual Spend</p>
          <p className="font-bold text-gray-900">${subtotalActual.toFixed(2)}</p>
        </div>
        <div className={`p-4 rounded-xl border ${variance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-[9px] uppercase font-semibold ${variance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Margin Variance</p>
          <p className={`font-bold ${variance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>${variance.toFixed(2)}</p>
        </div>
      </div>

      {/* Advanced Costing Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-[10px] text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">Item/Service</th>
              <th className="px-4 py-3">Est. Rate</th>
              <th className="px-4 py-3">Actual Rate</th>
              <th className="px-4 py-3 text-right">Variance</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-semibold text-gray-900">{item.desc}</td>
                <td className="px-4 py-3 text-gray-500 font-mono">${item.rate.toFixed(2)}</td>
                <td className="px-4 py-3 font-bold font-mono text-teal-600">${item.actual.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-bold ${(item.actual - item.rate) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    ${(item.actual - item.rate).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 size={14}/></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="w-full p-3 text-xs font-bold text-teal-600 hover:bg-teal-50 flex items-center justify-center gap-2 border-t border-gray-200">
            <Plus size={14} /> Add Line Item
        </button>
      </div>

      <div className="flex gap-4">
        <button className="flex-1 bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:border-gray-300">Export Report (PDF)</button>
        <button className="flex-1 bg-teal-600 text-white font-semibold py-3 rounded-xl hover:bg-teal-700 flex items-center justify-center gap-2 shadow-sm">
          <FileText size={16}/> Push to QuickBooks
        </button>
      </div>
    </div>
  );
}
