import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ConfirmVisitPage() {
  const { jobId } = useParams();
  const [status, setStatus] = useState('idle');

  const handleConfirm = async () => {
    setStatus('loading');
    await fetch(`/api/confirm-visit/${jobId}/confirm`, { method: 'POST' });
    setStatus('confirmed');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Confirm Site Visit</h1>
        <p className="text-gray-600 mb-6">Your Pro would like to walk your site to guarantee your fixed price.</p>
        
        {status === 'confirmed' ? (
          <div className="text-green-600 font-semibold p-4 bg-green-50 rounded">
            Confirmed! Your Pro has been notified.
          </div>
        ) : (
          <div className="space-y-4">
            <button 
              onClick={handleConfirm}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition"
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
