'use client'
import { useState } from 'react';
import { User, Save } from 'lucide-react';
import HomeownerProfile from '@/components/HomeownerProfile';

export default function ProfileSettings() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>
      <HomeownerProfile />
    </div>
  );
}
