'use client'
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumbs({ items }: { items: { label: string, href: string }[] }) {
  return (
    <nav className="flex items-center space-x-2 text-xs font-bold text-gray-500 mb-6">
      <Link href="/dashboard" className="hover:text-[#00bfa5]">Home</Link>
      {items.map((item, i) => (
        <div key={i} className="flex items-center space-x-2">
            <ChevronRight size={14} />
            <Link href={item.href} className={`${i === items.length - 1 ? 'text-[#1a1a1a]' : 'hover:text-[#00bfa5]'}`}>
                {item.label}
            </Link>
        </div>
      ))}
    </nav>
  );
}
