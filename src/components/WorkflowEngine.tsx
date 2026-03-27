'use client'
import { useState } from 'react';
import {
  FileText, Calendar, Play, Receipt, CreditCard,
  Check, ChevronRight, Clock, User, Plus, Trash2,
  Send, ArrowRight, AlertCircle, Camera, MessageSquare
} from 'lucide-react';

type Stage = 'estimate' | 'schedule' | 'start' | 'invoice' | 'pay';

const STAGES: { key: Stage; label: string; icon: React.ElementType }[] = [
  { key: 'estimate', label: 'Estimate', icon: FileText },
  { key: 'schedule', label: 'Schedule', icon: Calendar },
  { key: 'start', label: 'Start', icon: Play },
  { key: 'invoice', label: 'Invoice', icon: Receipt },
  { key: 'pay', label: 'Pay', icon: CreditCard },
];

export default function WorkflowEngine() {
  const [currentStage, setCurrentStage] = useState<Stage>('estimate');
  const [completedStages, setCompletedStages] = useState<Stage[]>([]);

  // Estimate state
  const [estimateItems, setEstimateItems] = useState([
    { id: 1, desc: 'Labor — Cabinet Demolition', qty: 1, rate: 450 },
    { id: 2, desc: 'Materials — Subway Tile (sq ft)', qty: 120, rate: 8.50 },
    { id: 3, desc: 'Labor — Tile Installation', qty: 1, rate: 1200 },
  ]);
  const [estimateSent, setEstimateSent] = useState(false);
  
  // Consultation Hub State
  const [isSiteVisit, setIsSiteVisit] = useState(false);
  
  // Add auto-notif logic
  const handleSiteVisit = async (isVisit: boolean) => {
    setIsSiteVisit(isVisit);
    if (isVisit) {
        // Trigger notification
        try {
            await fetch('/api/notify-site-visit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    proName: 'Your Pro', 
                    jobName: 'Your Home Improvement',
                    confirmLink: 'https://prolink.example.com/confirm'
                })
            });
        } catch (err) {
            console.error('Failed to notify:', err);
        }
    }
  };
  const [consultationFee, setConsultationFee] = useState(0);

  // Schedule state
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [assignedContractor, setAssignedContractor] = useState('');

  // Start state
  const [jobNotes, setJobNotes] = useState('');
  const [jobStarted, setJobStarted] = useState(false);

  // Invoice state
  const [invoiceSent, setInvoiceSent] = useState(false);

  // Pay state
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRecorded, setPaymentRecorded] = useState(false);

  const estimateTotal = estimateItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const finalTotal = isSiteVisit ? (estimateTotal - consultationFee) : estimateTotal;

  const stageIndex = (s: Stage) => STAGES.findIndex(st => st.key === s);

  const advanceStage = () => {
    const idx = stageIndex(currentStage);
    if (idx < STAGES.length - 1) {
      setCompletedStages([...completedStages, currentStage]);
      setCurrentStage(STAGES[idx + 1].key);
    } else {
      setCompletedStages([...completedStages, currentStage]);
    }
  };

  const goToStage = (stage: Stage) => {
    const idx = stageIndex(stage);
    const currentIdx = stageIndex(currentStage);
    if (idx <= currentIdx || completedStages.includes(stage)) {
      setCurrentStage(stage);
    }
  };

  const addEstimateItem = () => {
    setEstimateItems([...estimateItems, { id: Date.now(), desc: '', qty: 1, rate: 0 }]);
  };

  const removeEstimateItem = (id: number) => {
    setEstimateItems(estimateItems.filter(item => item.id !== id));
  };

  const updateEstimateItem = (id: number, field: string, value: string | number) => {
    setEstimateItems(estimateItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const isStageComplete = (stage: Stage) => completedStages.includes(stage);
  const isStageActive = (stage: Stage) => currentStage === stage;
  const isStageAccessible = (stage: Stage) => {
    const idx = stageIndex(stage);
    const currentIdx = stageIndex(currentStage);
    return idx <= currentIdx || isStageComplete(stage);
  };

  const canAdvance = (): boolean => {
    switch (currentStage) {
      case 'estimate': return estimateSent && estimateItems.length > 0;
      case 'schedule': return !!scheduleDate && !!scheduleTime && !!assignedContractor;
      case 'start': return jobStarted;
      case 'invoice': return invoiceSent;
      case 'pay': return paymentRecorded;
      default: return false;
    }
  };

  const allComplete = completedStages.length === STAGES.length;

  return (
    <div className="space-y-8">
      {/* Stage Stepper */}
      <div className="flex items-center justify-between">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const complete = isStageComplete(stage.key);
          const active = isStageActive(stage.key);
          const accessible = isStageAccessible(stage.key);

          return (
            <div key={stage.key} className="flex items-center flex-1">
              <button
                onClick={() => accessible && goToStage(stage.key)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  complete
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer'
                    : active
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 cursor-default'
                    : accessible
                    ? 'bg-gray-100 text-gray-600 border border-gray-200 cursor-pointer hover:border-teal-300'
                    : 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed'
                }`}
              >
                {complete ? <Check size={14} strokeWidth={3} /> : <Icon size={14} />}
                <span className="hidden lg:inline">{stage.label}</span>
              </button>
              {i < STAGES.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${
                  complete ? 'bg-emerald-300' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Job Complete Banner */}
      {allComplete && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
          <Check size={32} className="mx-auto text-emerald-600 mb-2" />
          <p className="font-bold text-emerald-800 text-lg">Job Complete</p>
          <p className="text-emerald-600 text-sm mt-1">All stages finished. Payment recorded.</p>
        </div>
      )}

      {/* Stage Content */}
      {!allComplete && (
        <div className="space-y-6">

          {/* ─── ESTIMATE STAGE ─── */}
          {currentStage === 'estimate' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Build Estimate</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Add line items for labor, materials, and services.</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Total</p>
                  <p className="text-2xl font-bold text-gray-900">${finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

               {/* Consultation Hub */}
               <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-teal-900 text-sm">Consultation Hub</h4>
                  <p className="text-xs text-teal-700 mt-0.5">Apply credits or site visit fees.</p>
                </div>
                <div className="flex gap-4 items-center">
                  <label className="flex items-center gap-2 text-xs font-semibold text-teal-900 cursor-pointer">
                    <input type="checkbox" checked={isSiteVisit} onChange={(e) => handleSiteVisit(e.target.checked)} className="rounded border-teal-300 text-teal-600 focus:ring-teal-500" />
                    Site Visit
                  </label>
                  <input
                    type="number"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(Number(e.target.value))}
                    className="w-20 bg-white border border-teal-200 rounded-lg px-2 py-1 text-sm text-teal-900 font-mono"
                    placeholder="Fee ($)"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="text-[10px] text-gray-500 uppercase bg-white border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-center w-20">Qty</th>
                      <th className="px-4 py-3 text-right w-28">Rate</th>
                      <th className="px-4 py-3 text-right w-28">Line Total</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimateItems.map(item => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="px-4 py-2.5">
                          <input
                            value={item.desc}
                            onChange={(e) => updateEstimateItem(item.id, 'desc', e.target.value)}
                            className="w-full bg-transparent font-medium text-gray-900 placeholder:text-gray-300"
                            placeholder="Item description"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateEstimateItem(item.id, 'qty', Number(e.target.value))}
                            className="w-full bg-transparent text-center font-mono text-gray-700"
                            min={1}
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateEstimateItem(item.id, 'rate', Number(e.target.value))}
                            className="w-full bg-transparent text-right font-mono text-gray-700"
                            min={0}
                            step={0.01}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold font-mono text-gray-900">
                          ${(item.qty * item.rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button onClick={() => removeEstimateItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={addEstimateItem}
                  className="w-full p-3 text-xs font-bold text-teal-600 hover:bg-teal-50 flex items-center justify-center gap-2 border-t border-gray-200 transition-colors"
                >
                  <Plus size={14} /> Add Line Item
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEstimateSent(true)}
                  disabled={estimateSent || estimateItems.length === 0}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                    estimateSent
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                  }`}
                >
                  {estimateSent ? <><Check size={16} /> Estimate Sent</> : <><Send size={16} /> Send Estimate to Customer</>}
                </button>
              </div>
            </div>
          )}

          {/* ─── SCHEDULE STAGE ─── */}
          {currentStage === 'schedule' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Schedule Job</h3>
                <p className="text-sm text-gray-500 mt-0.5">Set the date, time, and assign a contractor.</p>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-200">
                {/* Date & Time Row */}
                <div className="grid grid-cols-2 divide-x divide-gray-200">
                  <div className="p-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900"
                    />
                  </div>
                  <div className="p-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900"
                    />
                  </div>
                </div>
                {/* Contractor Row */}
                <div className="p-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Assign Contractor</label>
                  <select
                    value={assignedContractor}
                    onChange={(e) => setAssignedContractor(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900"
                  >
                    <option value="">Select a contractor...</option>
                    <option value="aaa-electric">AAA Electric — Electrician</option>
                    <option value="reliable-plumbing">Reliable Plumbing — Plumber</option>
                    <option value="precision-roofing">Precision Roofing — Roofer</option>
                    <option value="quick-fix-hvac">Quick Fix HVAC — HVAC Tech</option>
                  </select>
                </div>
              </div>

              {scheduleDate && scheduleTime && assignedContractor && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
                  <Calendar size={18} className="text-teal-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-bold text-teal-800">
                      {new Date(scheduleDate + 'T' + scheduleTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {scheduleTime}
                    </p>
                    <p className="text-teal-600 mt-0.5 text-xs">
                      Assigned to <span className="font-semibold">{assignedContractor.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── START STAGE ─── */}
          {currentStage === 'start' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Start Job</h3>
                <p className="text-sm text-gray-500 mt-0.5">Mark the job as started and add field notes.</p>
              </div>

              {!jobStarted ? (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-bold text-amber-800">Ready to Begin</p>
                      <p className="text-amber-700 mt-0.5">Contractor is on-site. Confirm to mark this job as in-progress.</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setJobStarted(true)}
                    className="w-full bg-teal-600 text-white font-semibold py-3.5 rounded-xl hover:bg-teal-700 shadow-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <Play size={16} /> Mark Job as Started
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="font-bold text-emerald-800 text-sm">Job In Progress</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Field Notes</label>
                    <textarea
                      value={jobNotes}
                      onChange={(e) => setJobNotes(e.target.value)}
                      placeholder="Customer requested tile grout in 'Warm Gray'. Back door code is 4421..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-900 h-28 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button className="bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:border-teal-300 hover:text-teal-600 flex items-center justify-center gap-2 text-sm transition-all">
                      <Camera size={16} /> Add Photos
                    </button>
                    <button className="bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:border-teal-300 hover:text-teal-600 flex items-center justify-center gap-2 text-sm transition-all">
                      <MessageSquare size={16} /> Message Customer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── INVOICE STAGE ─── */}
          {currentStage === 'invoice' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Generate Invoice</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Review final amounts and send invoice to customer.</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Invoice Total</p>
                  <p className="text-2xl font-bold text-gray-900">${estimateTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice #PLK-2026-0047</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    invoiceSent
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {invoiceSent ? 'Sent' : 'Draft'}
                  </span>
                </div>
                {estimateItems.map(item => (
                  <div key={item.id} className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{item.desc}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{item.qty} × ${item.rate.toFixed(2)}</p>
                    </div>
                    <p className="font-bold font-mono text-gray-900">${(item.qty * item.rate).toFixed(2)}</p>
                  </div>
                ))}
                <div className="px-4 py-3 border-t-2 border-gray-200 flex items-center justify-between bg-white">
                  <p className="font-bold text-gray-900">Total Due</p>
                  <p className="font-bold text-lg font-mono text-gray-900">${estimateTotal.toFixed(2)}</p>
                </div>
              </div>

              <button
                onClick={() => setInvoiceSent(true)}
                disabled={invoiceSent}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  invoiceSent
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                }`}
              >
                {invoiceSent ? <><Check size={16} /> Invoice Sent</> : <><Send size={16} /> Send Invoice to Customer</>}
              </button>
            </div>
          )}

          {/* ─── PAY STAGE ─── */}
          {currentStage === 'pay' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Record Payment</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Confirm payment received and close the job.</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Amount Due</p>
                  <p className="text-2xl font-bold text-gray-900">${estimateTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {!paymentRecorded ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Method</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Credit Card', 'ACH / Bank', 'Check'].map(method => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          className={`p-3 rounded-xl text-sm font-semibold border transition-all ${
                            paymentMethod === method
                              ? 'bg-teal-50 text-teal-700 border-teal-300'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setPaymentRecorded(true)}
                    disabled={!paymentMethod}
                    className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                      paymentMethod
                        ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <CreditCard size={16} /> Record Payment — ${estimateTotal.toFixed(2)}
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                  <Check size={28} className="mx-auto text-emerald-600 mb-2" />
                  <p className="font-bold text-emerald-800">Payment Received</p>
                  <p className="text-emerald-600 text-sm mt-1">${estimateTotal.toFixed(2)} via {paymentMethod}</p>
                </div>
              )}
            </div>
          )}

          {/* Advance Button */}
          {!allComplete && (
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={advanceStage}
                disabled={!canAdvance()}
                className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  canAdvance()
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {stageIndex(currentStage) < STAGES.length - 1 ? (
                  <>Advance to {STAGES[stageIndex(currentStage) + 1].label} <ArrowRight size={16} /></>
                ) : (
                  <>Complete Job <Check size={16} /></>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
