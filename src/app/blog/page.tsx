'use client'
import Link from 'next/link'
import { Pen, ArrowRight } from 'lucide-react'

const posts = [
  {
    slug: 'automated-dispatch',
    title: 'Automated Dispatching',
    desc: 'Scheduling software for crews who hate schedules.',
    date: 'Mar 15, 2026',
    tag: 'Operations',
  },
  {
    slug: 'construction-tech-trends',
    title: 'Construction Tech Trends: 2026',
    desc: "What's helping businesses scale in 2026.",
    date: 'Mar 10, 2026',
    tag: 'Industry',
  },
  {
    slug: 'contractor-vetting',
    title: 'Building a Network of Trusted Subs',
    desc: 'How to vet and maintain a high-quality subcontractor pool.',
    date: 'Mar 8, 2026',
    tag: 'Growth',
  },
  {
    slug: 'crm-advantage',
    title: 'The CRM Advantage',
    desc: 'How centralized data prevents the "he said, she said" arguments.',
    date: 'Mar 5, 2026',
    tag: 'Software',
  },
  {
    slug: 'digital-quoting',
    title: 'The Death of the Paper Estimate',
    desc: 'Why on-site digital quoting tools are mandatory for the modern contractor.',
    date: 'Mar 2, 2026',
    tag: 'Sales',
  },
  {
    slug: 'electrical-safety',
    title: 'Electrical Upgrades that Sell',
    desc: 'Increase order value and customer satisfaction with smart electrical add-ons.',
    date: 'Feb 28, 2026',
    tag: 'Sales',
  },
  {
    slug: 'home-maintenance',
    title: 'Proactive Maintenance for Contractor Success',
    desc: 'How regular service contracts keep your schedule predictable.',
    date: 'Feb 25, 2026',
    tag: 'Growth',
  },
  {
    slug: 'roofing-tips',
    title: '5 Roofing Efficiency Hacks for Contractors',
    desc: 'Increase your profit margins and speed on every shingle job.',
    date: 'Feb 22, 2026',
    tag: 'Operations',
  },
]

const tagColors: Record<string, string> = {
  Operations: 'bg-blue-100 text-blue-700',
  Industry: 'bg-purple-100 text-purple-700',
  Growth: 'bg-green-100 text-green-700',
  Software: 'bg-gray-100 text-gray-700',
  Sales: 'bg-orange-100 text-orange-700',
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-2">Prolink Blog</p>
          <h1 className="text-3xl font-black text-gray-900 mb-3">Tips & Insights for Contractors</h1>
          <p className="text-gray-500 text-base max-w-xl">Practical guides, industry trends, and business advice for service professionals running and growing their operations.</p>
        </div>
      </div>

      {/* Post Grid */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`}
              className="group bg-white rounded-2xl border border-gray-100 p-7 hover:border-teal-500 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${tagColors[post.tag] || 'bg-gray-100 text-gray-600'}`}>
                  {post.tag}
                </span>
                <span className="text-xs text-gray-400">{post.date}</span>
              </div>
              <h2 className="text-lg font-black text-gray-900 mb-2 group-hover:text-teal-600 transition-colors">
                {post.title}
              </h2>
              <p className="text-sm text-gray-500 mb-5 leading-relaxed">{post.desc}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-600">
                Read More <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
