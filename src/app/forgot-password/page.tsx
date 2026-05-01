'use client';
import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      // NOTE: This endpoint needs to be implemented in your new Express backend!
      await apiClient('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setStatus('success');
      setMessage('If an account exists, you will receive a reset email shortly.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Error occurred, please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot password?</h1>
        <p className="text-gray-600 mb-6">Enter your email and we'll send you a link to reset your password.</p>
        
        {status === 'success' ? (
          <div className="p-4 bg-green-50 text-green-700 rounded-lg">{message}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@yourcompany.com"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            {status === 'error' && <p className="text-red-600 text-sm">{message}</p>}
            <button 
              type="submit" 
              disabled={status === 'loading'}
              className="w-full bg-[#0f3a7d] text-white py-3 rounded-xl font-semibold hover:bg-[#0c2e5c]"
            >
              {status === 'loading' ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800">← Back to login</Link>
        </div>
      </div>
    </div>
  );
}
