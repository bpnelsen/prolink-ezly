'use client'
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Plus, Trash2, ChevronDown, Search } from 'lucide-react';
import Breadcrumbs from '../../components/Breadcrumbs';
import { supabase } from '../../lib/supabase-client';

interface LineItem {
  id: number;
  description: string;
  qty: number;
  unit: string;
  rate: number;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
}

const TRADES = ['Electrical', 'Plumbing', 'HVAC', 'Roofing', 'Kitchen Remodel', 'Bath Reno', 'Deck Build', 'Flooring', 'Painting', 'Landscaping', 'General Contractor', 'Other'];
const LEAD_SOURCES = ['Referral', 'Website', 'Phone Call', 'Returning Customer', 'Social Media', 'Door Knock', 'Google', 'Other'];
const PRIORITIES = ['Low', 'Normal', 'High', 'Emergency'];

export default function NewJobPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    }>
      <NewJob />
    </Suspense>
  );
}

function NewJob() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id');

  const [loading, setLoading] = useState(false);
  const [prefilling, setPrefilling] = useState(!!clientId);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Customer
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Job details
  const [title, setTitle] = useState('');
  const [trade, setTrade] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [leadSource, setLeadSource] = useState('');
  const [stage, setStage] = useState('Lead');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: 1, description: '', qty: 1, unit: 'hr', rate: 0 },
  ]);

  // Fetch clients for dropdown
  useEffect(() => {
    const fetchClients = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone, email, address_line1, address_line2')
        .eq('contractor_id', session.user.id)
        .neq('is_deleted', true)
        .order('first_name');
      if (data) setClients(data);
    };
    fetchClients();
  }, []);

  // Prefill from client_id query param
  useEffect(() => {
    if (!clientId) return;
    const fetchClient = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone, email, address_line1, address_line2')
        .eq('id', clientId)
        .single();
      if (data) {
        setSelectedClient(data);
        setClientSearch(`${data.first_name} ${data.last_name}`);
        const addr = [data.address_line1, data.address_line2].filter(Boolean).join(', ');
        if (addr) setSiteAddress(addr);
      }
      setPrefilling(false);
    };
    fetchClient();
  }, [clientId]);

  const filteredClients = clients.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone?.includes(clientSearch)
  );

  const selectClient = (c: Client) => {
    setSelectedClient(c);
    setClientSearch(`${c.first_name} ${c.last_name}`);
    setShowClientDropdown(false);
    const addr = [c.address_line1, c.address_line2].filter(Boolean).join(', ');
    if (addr && !siteAddress) setSiteAddress(addr);
  };

  // Line item helpers
  const addLineItem = () => {
    setLineItems(prev => [...prev, { id: Date.now(), description: '', qty: 1, unit: 'hr', rate: 0 }]);
  };
  const removeLineItem = (id: number) => {
    setLineItems(prev => prev.filter(i => i.id !== id));
  };
  const updateLineItem = (id: number, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const subtotal = lineItems.reduce((sum, i) => sum + i.qty * i.rate, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('You must be logged in.'); setLoading(false); return; }

      const scheduledAt = scheduledDate
        ? new Date(`${scheduledDate}${scheduledTime ? 'T' + scheduledTime : ''}`).toISOString()
        : null;

      // Create pipeline entry
      const { error: pipelineError } = await supabase.from('pl_pipelines').insert({
        contractor_id: session.user.id,
        project_name: title.trim(),
        stage,
        value: subtotal,
        deadline: scheduledDate || null,
      });
      if (pipelineError) throw pipelineError;

      // Create task entry linked to client
      if (selectedClient) {
        await supabase.from('tasks').insert({
          contractor_id: session.user.id,
          client_id: selectedClient.id,
          title: title.trim(),
          description: notes.trim() || null,
          address: siteAddress.trim() || null,
          status: stage === 'Active' ? 'active' : 'pending',
          scheduled_at: scheduledAt,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        if (clientId) router.push(`/customers/${clientId}/jobs`);
        else router.push('/dashboard');
      }, 1500);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Error creating job');
    }
  };

  if (prefilling) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Breadcrumbs items={[{ label: 'New Job', href: '/new-job' }]} />
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-teal-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">Job Created!</p>
            <p className="text-gray-500 text-sm mt-2">
              {clientId ? 'Redirecting to client jobs...' : 'Redirecting to Dashboard...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[{ label: 'New Job', href: '/new-job' }]} />
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Jobs</p>
          <h1 className="text-2xl font-bold text-gray-900">Create New Job</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Customer */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-5">Customer</h2>
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Search Existing Customer</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3.5 text-gray-400" />
                <input
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setShowClientDropdown(true); setSelectedClient(null); }}
                  onFocus={() => setShowClientDropdown(true)}
                  className="w-full bg-gray-50 pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="Search by name, email, or phone..."
                />
              </div>
              {showClientDropdown && clientSearch && filteredClients.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectClient(c)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <p className="text-sm font-semibold text-gray-800">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-gray-400">{c.phone ?? c.email ?? 'No contact info'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedClient && (
              <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-xl grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-teal-600 tracking-wider">Name</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedClient.first_name} {selectedClient.last_name}</p>
                </div>
                {selectedClient.phone && (
                  <div>
                    <p className="text-[10px] font-bold uppercase text-teal-600 tracking-wider">Phone</p>
                    <p className="text-sm text-gray-700 mt-0.5">{selectedClient.phone}</p>
                  </div>
                )}
                {selectedClient.email && (
                  <div>
                    <p className="text-[10px] font-bold uppercase text-teal-600 tracking-wider">Email</p>
                    <p className="text-sm text-gray-700 mt-0.5">{selectedClient.email}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Job Details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-5">Job Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Job Title *</label>
                <input
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="e.g. Kitchen Remodel — Johnson Residence"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Trade / Service Type</label>
                <select value={trade} onChange={e => setTrade(e.target.value)}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition">
                  <option value="">Select trade...</option>
                  {TRADES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Stage</label>
                <select value={stage} onChange={e => setStage(e.target.value)}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition">
                  <option>Lead</option>
                  <option>Quoted</option>
                  <option>Active</option>
                  <option>Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Priority</label>
                <div className="flex gap-2">
                  {PRIORITIES.map(p => (
                    <button key={p} type="button" onClick={() => setPriority(p)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${
                        priority === p
                          ? p === 'Emergency' ? 'bg-red-600 text-white border-red-600'
                          : p === 'High' ? 'bg-orange-500 text-white border-orange-500'
                          : p === 'Low' ? 'bg-gray-200 text-gray-700 border-gray-200'
                          : 'bg-teal-600 text-white border-teal-600'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lead Source</label>
                <select value={leadSource} onChange={e => setLeadSource(e.target.value)}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition">
                  <option value="">Select source...</option>
                  {LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Site Address</label>
                <input
                  value={siteAddress}
                  onChange={e => setSiteAddress(e.target.value)}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  placeholder="Job site address (if different from customer address)"
                />
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-5">Scheduling</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date</label>
                <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Time</label>
                <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Est. Duration</label>
                <select value={estimatedDuration} onChange={e => setEstimatedDuration(e.target.value)}
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition">
                  <option value="">Select...</option>
                  <option>1 hour</option>
                  <option>2 hours</option>
                  <option>4 hours</option>
                  <option>Full day</option>
                  <option>2 days</option>
                  <option>3–5 days</option>
                  <option>1–2 weeks</option>
                  <option>2–4 weeks</option>
                  <option>1+ month</option>
                </select>
              </div>
            </div>
          </div>

          {/* Line Items / Estimate */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-5">Estimate / Line Items</h2>
            <div className="space-y-3">
              <div className="hidden md:grid grid-cols-12 gap-3 px-1">
                <p className="col-span-5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Description</p>
                <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</p>
                <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit</p>
                <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Rate ($)</p>
                <p className="col-span-1"></p>
              </div>
              {lineItems.map(item => (
                <div key={item.id} className="grid grid-cols-12 gap-3 items-center">
                  <input
                    value={item.description}
                    onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                    className="col-span-12 md:col-span-5 bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                    placeholder="Labor, material, service..."
                  />
                  <input
                    type="number" min="0" step="0.5"
                    value={item.qty}
                    onChange={e => updateLineItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                    className="col-span-4 md:col-span-2 bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  />
                  <select
                    value={item.unit}
                    onChange={e => updateLineItem(item.id, 'unit', e.target.value)}
                    className="col-span-4 md:col-span-2 bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition">
                    <option value="hr">hr</option>
                    <option value="ea">ea</option>
                    <option value="sqft">sqft</option>
                    <option value="lft">lft</option>
                    <option value="day">day</option>
                    <option value="lot">lot</option>
                  </select>
                  <input
                    type="number" min="0" step="0.01"
                    value={item.rate}
                    onChange={e => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    className="col-span-3 md:col-span-2 bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                    placeholder="0.00"
                  />
                  <button type="button" onClick={() => removeLineItem(item.id)}
                    className="col-span-1 flex justify-center text-gray-300 hover:text-red-500 transition">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addLineItem}
              className="mt-4 flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700 transition">
              <Plus size={14} /> Add Line Item
            </button>

            {/* Totals */}
            <div className="mt-6 pt-5 border-t border-gray-100 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-2">
                  <span className="text-gray-900">Estimate Total</span>
                  <span className="text-teal-600">${subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-5">Notes & Instructions</h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition resize-none"
              placeholder="Scope of work, access codes, special instructions, materials needed..."
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pb-8">
            <button type="button" onClick={() => router.back()}
              className="px-6 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading || !title.trim()}
              className="flex-1 py-3.5 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition shadow-sm disabled:opacity-50">
              {loading ? 'Creating...' : `Create Job${subtotal > 0 ? ` — $${subtotal.toFixed(2)}` : ''}`}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
