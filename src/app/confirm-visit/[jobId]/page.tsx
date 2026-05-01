'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase-client';
import { apiClient } from '../../../lib/api-client';

export default function ConfirmVisitPage() {
  const { jobId } = useParams();
  const [status, setStatus] = useState('idle');
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJob() {
      if (!jobId) return;
      const { data, error } = await supabase
        .from('tasks')
        .select('title, address, description, images')
        .eq('id', jobId)
        .single();
        
      if (data) setJob(data);
      setLoading(false);
    }
    fetchJob();
  }, [jobId]);

  const handleConfirm = async () => {
    setStatus('loading');
    try {
      await apiClient(`/api/v1/jobs/${jobId}/confirm`, { method: 'POST' });
      setStatus('confirmed');
    } catch (err) {
      console.error('Confirmation failed', err);
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Confirm Site Visit</h1>
        <p className="text-gray-600 mb-6">Your Pro would like to walk your site to guarantee your fixed price.</p>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        ) : job ? (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
            <h2 className="font-semibold text-gray-900">{job.title}</h2>
            <p className="text-sm text-gray-500 mb-2">{job.address}</p>
            <p className="text-sm text-gray-700">{job.description}</p>
            
            {job.images && job.images.length > 0 ? (
               <div className="mt-4">
                 <h3 className="text-sm font-semibold text-gray-900 mb-2">Project Photos</h3>
                 <div className="grid grid-cols-4 gap-2">
                   {job.images.slice(0, 4).map((url: string, index: number) => (
                     <img key={index} src={url} alt={`Project photo ${index + 1}`} className="w-full h-16 object-cover rounded-md border border-gray-200" />
                   ))}
                 </div>
                 {job.images.length > 4 && (
                   <p className="text-xs text-blue-600 mt-2 font-medium">+{job.images.length - 4} more photos</p>
                 )}
               </div>
            ) : (
              <p className="text-xs text-gray-400 italic mt-4">No photos provided.</p>
            )}
          </div>
        ) : null}

        {status === 'confirmed' ? (
          <div className="text-green-600 font-semibold p-4 bg-green-50 rounded">
            Confirmed! Your Pro has been notified.
          </div>
        ) : (
          <div className="space-y-4">
            <button 
              onClick={handleConfirm}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition"
              disabled={loading}
            >
              Confirm Consultation
            </button>
            <button className="w-full border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition">
              Request New Time
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
