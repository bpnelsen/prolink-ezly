'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Briefcase, Calendar, MapPin, CheckCircle, Clock, AlertCircle, CircleDot } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabase-client';
import Breadcrumbs from '../../../../components/Breadcrumbs';

interface Job {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  status: string;
  scheduled_at: string | null;
  created_at: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: <Clock size={11} /> },
  confirmed: { label: 'Confirmed', color: 'bg-blue-50 text-blue-700 border-blue-200',       icon: <CheckCircle size={11} /> },
  active:    { label: 'Active',    color: 'bg-teal-50 text-teal-700 border-teal-200',        icon: <CircleDot size={11} /> },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-600 border-gray-200',       icon: <CheckCircle size={11} /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200', icon: <AlertCircle size={11} /> };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function ClientJobsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: clientData }, { data: jobsData }] = await Promise.all([
        supabase.from('clients').select('id, first_name, last_name').eq('id', id).single(),
        supabase.from('tasks').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      ]);
      if (clientData) setClient(clientData);
      if (jobsData) setJobs(jobsData);
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  const clientName = client ? `${client.first_name} ${client.last_name}` : 'Customer';

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumbs items={[
        { label: 'Customers', href: '/customers' },
        { label: clientName, href: `/customers/${id}` },
        { label: 'Jobs', href: '#' },
      ]} />
      <main className="max-w-4xl mx-auto p-4 md:p-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-200 transition">
              <ArrowLeft size={16} className="text-gray-500" />
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">{clientName}</p>
              <h1 className="text-2xl font-bold text-gray-900">Jobs & Bids</h1>
            </div>
          </div>
          <Link
            href="/new-job"
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm transition shadow-sm"
          >
            <Plus size={15} /> New Job
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
            <div key={status} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-900">
                {jobs.filter(j => j.status === status).length}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mt-0.5">{cfg.label}</p>
            </div>
          ))}
        </div>

        {/* Jobs list */}
        {jobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <Briefcase size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No jobs yet for this customer.</p>
            <p className="text-gray-400 text-sm mt-1">Create the first job or bid to get started.</p>
            <Link
              href="/new-job"
              className="inline-flex items-center gap-2 mt-4 text-teal-600 font-semibold text-sm hover:text-teal-700"
            >
              <Plus size={14} /> Create Job
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gray-200 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-bold text-gray-900 truncate">{job.title}</p>
                      <StatusBadge status={job.status} />
                    </div>
                    {job.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{job.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      {job.address && (
                        <span className="flex items-center gap-1"><MapPin size={11} /> {job.address}</span>
                      )}
                      {job.scheduled_at && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(job.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> Added {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
