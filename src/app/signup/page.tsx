'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'homeowner' as 'homeowner' | 'contractor' | 'admin',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Create the auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
            role: form.role,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // 2. Create profile row
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: form.full_name,
          email: form.email,
          role: form.role,
        });

        setSuccess(true);
        setTimeout(() => router.push('/login'), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Prolink <span className="font-light text-gray-500">by Ezly</span></h1>
          <p className="text-gray-500 mt-2">Create your account</p>
        </div>

        <div className="card p-8">
          {success ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="text-green-600" size={24} />
              </div>
              <p className="text-lg font-bold text-gray-900 mb-2">Account Created!</p>
              <p className="text-sm text-gray-500">Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="John Smith"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 pr-12"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: 'homeowner' })}
                    className={`p-3 rounded-lg border text-sm font-semibold transition ${form.role === 'homeowner' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    🏠 Homeowner
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: 'contractor' })}
                    className={`p-3 rounded-lg border text-sm font-semibold transition ${form.role === 'contractor' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    🔧 Contractor
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 text-white font-semibold py-3 rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : <><UserPlus size={18} /> Create Account</>}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="text-teal-600 hover:text-teal-700 font-semibold">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
