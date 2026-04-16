'use client'
import { useState, useEffect } from 'react';
import { MapPin, History, FileText, ChevronRight, User, Calendar, Clock, DollarSign, CheckCircle, CreditCard, ListChecks, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';
import { FeatureGate } from '@/components/FeatureGate';
import HomeownerProfile from '@/components/HomeownerProfile';
import WorkflowEngine from '@/components/WorkflowEngine';

export default function JobDetailHub() {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJob() {
      // Mock data for UI testing if no DB connection
      const mockJob = {
        id: '12345',
        Homeowner_ID: 'Smith Res',
        total_amount: '$4,500',
        status: 'schedule'
      };
      setJob(mockJob);
      setLoading(false);
    }
    fetchJob();
  }, []);

  if (loading) return <div className="p-4 md:p-8">Loading...</div>;
  if (!job) return <div className="p-4 md:p-8">No jobs found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header - Optimized for mobile */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-teal-600">← Back</Link>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
              {job.Homeowner_ID} <span className="text-gray-400 font-light text-sm">#{job.id}</span>
            </h1>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          
          {/* Left Column */}
          <div className="xl:col-span-1 space-y-4 md:space-y-6">
            <HomeownerProfile />

            <FeatureGate tier="team">
                <div className="card p-4 md:p-5">
                  <h3 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2"><CreditCard size={14} /> Financials</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total</span>
                        <span className="font-semibold text-gray-900">{job.total_amount || '$0'}</span>
                    </div>
                  </div>
                  <button className="w-full mt-4 bg-teal-50 text-teal-700 py-2 rounded-lg text-sm font-semibold hover:bg-teal-100 transition-colors">Send Invoice</button>
                </div>
            </FeatureGate>
          </div>

          {/* Right Column: Workflow & Timeline */}
          <div className="xl:col-span-2 space-y-4 md:space-y-6">
            <WorkflowEngine currentStatus={job.status || 'Not Started'} />

            <FeatureGate tier="scale">
                <div className="card p-4 md:p-5">
                  <h3 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2"><ListChecks size={14} /> Job Timeline</h3>
                  <p className="text-sm text-gray-500">Timeline data will sync once milestones are mapped.</p>
                </div>
            </FeatureGate>
          </div>
        </div>
      </div>
    </div>
  );
}
