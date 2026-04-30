'use client'
import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'

const posts = [
  {
    slug: 'automated-dispatch',
    title: 'Automated Dispatching',
    desc: 'Scheduling software for crews who hate schedules.',
    date: 'Mar 15, 2026',
    tag: 'Operations',
    readTime: '4 min',
    featured: true,
  },
  {
    slug: 'construction-tech-trends',
    title: 'Construction Tech Trends: 2026',
    desc: "What's helping businesses scale in 2026.",
    date: 'Mar 10, 2026',
    tag: 'Industry',
    readTime: '6 min',
    featured: false,
  },
  {
    slug: 'contractor-vetting',
    title: 'Building a Network of Trusted Subs',
    desc: 'How to vet and maintain a high-quality subcontractor pool.',
    date: 'Mar 8, 2026',
    tag: 'Growth',
    readTime: '5 min',
    featured: false,
  },
  {
    slug: 'crm-advantage',
    title: 'The CRM Advantage',
    desc: 'How centralized data prevents the "he said, she said" arguments.',
    date: 'Mar 5, 2026',
    tag: 'Software',
    readTime: '4 min',
    featured: false,
  },
  {
    slug: 'digital-quoting',
    title: 'The Death of the Paper Estimate',
    desc: 'Why on-site digital quoting tools are mandatory for the modern contractor.',
    date: 'Mar 2, 2026',
    tag: 'Sales',
    readTime: '5 min',
    featured: false,
  },
  {
    slug: 'electrical-safety',
    title: 'Electrical Upgrades that Sell',
    desc: 'Increase order value and customer satisfaction with smart electrical add-ons.',
    date: 'Feb 28, 2026',
    tag: 'Sales',
    readTime: '4 min',
    featured: false,
  },
  {
    slug: 'home-maintenance',
    title: 'Proactive Maintenance for Contractor Success',
    desc: 'How regular service contracts keep your schedule predictable.',
    date: 'Feb 25, 2026',
    tag: 'Growth',
    readTime: '5 min',
    featured: false,
  },
  {
    slug: 'roofing-tips',
    title: '5 Roofing Efficiency Hacks for Contractors',
    desc: 'Increase your profit margins and speed on every shingle job.',
    date: 'Feb 22, 2026',
    tag: 'Operations',
    readTime: '4 min',
    featured: false,
  },
]

const tagMeta: Record<string, { color: string; bg: string }> = {
  Operations: { bg: 'bg-blue-50', color: 'text-blue-600' },
  Industry:   { bg: 'bg-purple-50', color: 'text-purple-600' },
  Growth:     { bg: 'bg-emerald-50', color: 'text-emerald-600' },
  Software:   { bg: 'bg-slate-100', color: 'text-slate-600' },
  Sales:      { bg: 'bg-orange-50', color: 'text-orange-600' },
}

export default function BlogPage() {
  const featured = posts.find(p => p.featured) || posts[0]
  const rest = posts.filter(p => !p.featured)

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ── HERO BAND ── */}
      <div className="relative overflow-hidden bg-[#0f3a7d]">
        {/* Subtle dot grid */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Gradient orb */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #14b8a6 0%, transparent 70%)', transform: 'translate(30%, -30%)' }}
        />
        <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-20">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] animate-pulse" />
            <span className="text-white/80 text-xs font-semibold tracking-wider uppercase">Prolink Blog</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4" style={{ letterSpacing: '-1px' }}>
            Tips &amp; Insights<br />
            <span className="text-[#14b8a6]">for Contractors</span>
          </h1>
          <p className="text-white/60 text-lg max-w-lg leading-relaxed">
            Practical guides, industry trends, and business advice — written for people who run with dirty boots.
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-10 md:py-14">

        {/* ── FEATURED POST ── */}
        <Link href={`/blog/${featured.slug}`} className="group block mb-12">
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:border-[#14b8a6]/30 transition-all duration-300">
            <div className="grid md:grid-cols-2">
              <div className="relative overflow-hidden" style={{ minHeight: '280px' }}>
                <img
                  src={`/blog/${featured.slug}.jpg`}
                  alt={featured.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  style={{ objectPosition: 'center' }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0f3a7d]/20 to-transparent" />
              </div>
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${tagMeta[featured.tag]?.bg} ${tagMeta[featured.tag]?.color}`}>
                    {featured.tag}
                  </span>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={11} />{featured.readTime} read
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-[#0f3a7d] mb-3 leading-tight group-hover:text-[#14b8a6] transition-colors"
                  style={{ letterSpacing: '-0.5px' }}>
                  {featured.title}
                </h2>
                <p className="text-gray-500 leading-relaxed mb-6">{featured.desc}</p>
                <span className="inline-flex items-center gap-2 text-sm font-bold text-[#14b8a6]">
                  Read Article <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* ── SECTION LABEL ── */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">All Posts</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* ── POST GRID ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              {/* Image */}
              <div className="relative overflow-hidden" style={{ height: '180px' }}>
                <img
                  src={`/blog/${post.slug}.jpg`}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
              {/* Content */}
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${tagMeta[post.tag]?.bg} ${tagMeta[post.tag]?.color}`}>
                    {post.tag}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                    <Clock size={10} />{post.readTime}
                  </span>
                </div>
                <h3 className="font-black text-[#0f3a7d] text-base leading-snug mb-2 group-hover:text-[#14b8a6] transition-colors line-clamp-2"
                  style={{ letterSpacing: '-0.3px' }}>
                  {post.title}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-4 flex-1">{post.date}</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#14b8a6] mt-auto">
                  Read More <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
