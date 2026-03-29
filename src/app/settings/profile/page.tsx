'use client'
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import HomeownerProfile from '@/components/HomeownerProfile';

export default function ProfileSettings() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/settings" className="text-sm text-gray-500 hover:text-teal-600 flex items-center gap-1 mb-6">
          <ArrowLeft size={14} /> Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>
        <HomeownerProfile />
      </div>
    </div>
  );
}
