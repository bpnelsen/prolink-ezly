'use client'
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs({ items }: { items: { label: string; href: string }[] }) {
  const last = items.length - 1;
  const hasIntermediate = items.length > 2;
  return (
    <div className="bg-white border-b border-gray-100">
      <nav className="max-w-7xl mx-auto pl-14 pr-4 md:px-8 py-3 md:py-3.5 flex items-center gap-1 md:gap-1.5 text-xs md:text-sm overflow-hidden">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-gray-400 hover:text-teal-600 transition-colors font-medium shrink-0">
          <Home size={14} />
          <span className="hidden sm:inline">Home</span>
        </Link>
        {hasIntermediate && (
          <div className="md:hidden flex items-center gap-1 text-gray-300 shrink-0">
            <ChevronRight size={14} />
            <span>…</span>
          </div>
        )}
        {items.map((item, i) => {
          const isLast = i === last;
          const isIntermediate = !isLast && hasIntermediate;
          return (
            <div key={i} className={`flex items-center gap-1 md:gap-1.5 min-w-0 ${isIntermediate ? 'hidden md:flex' : ''}`}>
              <ChevronRight size={14} className="text-gray-300 shrink-0" />
              {isLast ? (
                <span className="text-gray-800 font-semibold truncate">{item.label}</span>
              ) : (
                <Link href={item.href} className="text-gray-400 hover:text-teal-600 transition-colors font-medium truncate">
                  {item.label}
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
