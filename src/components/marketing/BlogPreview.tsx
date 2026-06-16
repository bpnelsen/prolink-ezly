/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'

/**
 * Blog preview grid. Light section with cards that pick up the
 * Algolia-blue accent on hover.
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
    <section id="blog" className="relative scroll-mt-24 overflow-hidden bg-[#F7F8FC] py-20 sm:py-24 lg:py-28">
      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="mb-14 text-center sm:mb-16">
          <span className="inline-block rounded-full border border-[#5468FF]/20 bg-[#5468FF]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5468FF]">
            From the Blog
          </span>
          <h2 className="mx-auto mt-4 max-w-[680px] text-[clamp(28px,4.8vw,46px)] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#0B0B1F]">
            Tips &amp; insights for contractors
          </h2>
          <p className="mx-auto mt-4 max-w-[580px] text-[17px] leading-relaxed text-gray-500">
            Practical guides, industry trends, and business advice — written
            for people who run with dirty boots.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map(p => (
            <Link
              key={p.href}
              href={p.href}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200/70 bg-white transition-all hover:-translate-y-1 hover:border-[#5468FF]/40 hover:shadow-[0_20px_40px_-12px_rgba(84,104,255,0.25)]"
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
                <span className="inline-block self-start rounded-full border border-[#5468FF]/20 bg-[#5468FF]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5468FF]">
                  {p.tag}
                </span>
                <h3 className="mt-3 text-[15px] font-extrabold leading-tight tracking-tight text-[#0B0B1F]">
                  {p.title}
                </h3>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-gray-500">
                  {p.desc}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#5468FF] transition-transform group-hover:translate-x-0.5">
                  Read more <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/blog"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-gray-300 bg-white px-7 py-3.5 text-sm font-bold text-[#0B0B1F] transition-all hover:-translate-y-0.5 hover:border-[#5468FF]/40 hover:shadow-[0_8px_20px_-6px_rgba(84,104,255,0.3)]"
          >
            View all posts <span aria-hidden="true" className="ml-1.5">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
