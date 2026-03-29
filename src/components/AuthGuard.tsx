'use client'
import { useAuth, UserRole } from '@/context/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  roles?: UserRole[];       // Optional: restrict to specific roles
  fallback?: React.ReactNode; // Optional: show instead of default
}

export default function AuthGuard({ children, roles, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Please sign in to continue.</p>
          <a href="/login" className="bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // Check role access
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 mb-2">Access Denied</p>
          <p className="text-sm text-gray-500">You don&apos;t have permission to view this page.</p>
          <a href="/dashboard" className="mt-4 inline-block bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
