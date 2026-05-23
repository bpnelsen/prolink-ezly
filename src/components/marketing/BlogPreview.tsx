/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'

/**
 * Blog preview grid linking to four existing blog posts. Uses the local
 * thumbnails in /public/blog rather than external Unsplash photos so the
 * page works offline and loads instantly. 1-col on mobile, 2-col on sm,
 * 4-col on lg.
 */
export function BlogPreview() {
  const posts = [
    {
      href: '/blog/roofing-tips',
      img: '/blog/roofing-tips.jpg',
      tag: 'Operations',
      title: '5 Roofing Efficiency Hacks for Contractors',
      desc: 'Increase your profit margins and speed on every shingle job.',
    },
    {
      href: '/blog/electrical-safety',
      img: '/blog/electrical-safety.jpg',
      tag: 'Sales',
      title: 'Electrical Upgrades that Sell',
      desc: 'Increase order value with smart electrical add-ons.',
    },
    {
      href: '/blog/crm-advantage',
      img: '/blog/crm-advantage.jpg',
      tag: 'Software',
      title: 'The CRM Advantage',
      desc: 'How centralized data prevents the "he said, she said" arguments.',
    },
    {
      href: '/blog/home-maintenance',
      img: '/blog/home-maintenance.jpg',
      tag: 'Growth',
      title: 'Proactive Maintenance for Contractor Success',
      desc: 'How regular service contracts keep your schedule predictable.',
    },
  ]

  return (
    <section id="blog" className="scroll-mt-24 bg-gray-50 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        <div className="mb-12 text-center sm:mb-14">
          <span className="font-['Inter',sans-serif] text-[11px] font-bold uppercase tracking-[0.12em] text-[#F97316]">
            From the Blog
          </span>
          <h2 className="mx-auto mt-2.5 font-['Inter',sans-serif] text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.15] tracking-tight text-[#0F3A7D]">
            Tips &amp; insights for contractors
          </h2>
          <p className="mx-auto mt-3.5 max-w-[560px] text-base leading-relaxed text-gray-500 sm:text-[17px]">
            Practical guides, industry trends, and business advice — written
            for people who run with dirty boots.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map(p => (
            <Link
              key={p.href}
              href={p.href}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:-translate-y-1 hover:border-[#F97316] hover:shadow-[0_8px_32px_rgba(249,115,22,0.1)]"
            >
              <div className="aspect-[16/9] overflow-hidden">
                <img
                  src={p.img}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <span className="inline-block self-start rounded-full bg-[#F97316]/10 px-2.5 py-1 font-['Inter',sans-serif] text-[10px] font-bold uppercase tracking-wider text-[#F97316]">
                  {p.tag}
                </span>
                <h3 className="mt-3 font-['Inter',sans-serif] text-[15px] font-extrabold leading-tight text-[#0F3A7D]">
                  {p.title}
                </h3>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-gray-500">
                  {p.desc}
                </p>
                <span className="mt-4 font-['Inter',sans-serif] text-xs font-bold text-[#F97316]">
                  Read More →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/blog"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-gray-200 bg-transparent px-8 py-3.5 font-['Inter',sans-serif] text-sm font-bold text-[#0F3A7D] transition-colors hover:border-[#0F3A7D] hover:bg-[#0F3A7D]/5"
          >
            View All Posts →
          </Link>
        </div>
      </div>
    </section>
  )
}
