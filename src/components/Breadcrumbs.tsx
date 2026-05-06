'use client'
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs({ items }: { items: { label: string; href: string }[] }) {
  return (
    <div className="bg-white border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-6 md:px-8 py-3.5 flex items-center gap-1.5 text-sm">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-gray-400 hover:text-teal-600 transition-colors font-medium">
          <Home size={14} />
          <span>Home</span>
        </Link>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <ChevronRight size={14} className="text-gray-300" />
            {i === items.length - 1 ? (
              <span className="text-gray-800 font-semibold">{item.label}</span>
            ) : (
              <Link href={item.href} className="text-gray-400 hover:text-teal-600 transition-colors font-medium">
                {item.label}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
