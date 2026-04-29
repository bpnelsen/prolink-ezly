import Link from 'next/link'
import { ChevronLeft, Home } from 'lucide-react'

interface Crumb {
  label: string
  href: string
}

interface PageHeaderProps {
  title: string
  crumbs?: Crumb[]
}

export default function PageHeader({ title, crumbs = [] }: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm">
        <Link href="/dashboard" className="text-gray-400 hover:text-[#14b8a6] transition flex items-center gap-1">
          <Home size={14} />
          <span>Dashboard</span>
        </Link>
        {crumbs.map((c) => (
          <span key={c.href} className="flex items-center gap-2">
            <ChevronLeft size={14} className="text-gray-300 rotate-180" />
            <Link href={c.href} className="text-gray-400 hover:text-[#14b8a6] transition">{c.label}</Link>
          </span>
        ))}
        <ChevronLeft size={14} className="text-gray-300 rotate-180" />
        <span className="font-semibold text-gray-700">{title}</span>
      </div>
    </div>
  )
}
