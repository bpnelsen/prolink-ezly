import { MarketingNav } from '@/components/marketing/MarketingNav'
import { Hero } from '@/components/marketing/Hero'
import { ProofBar } from '@/components/marketing/ProofBar'
import { ProblemSolution } from '@/components/marketing/ProblemSolution'
import { Features } from '@/components/marketing/Features'
import { PhotoBand } from '@/components/marketing/PhotoBand'
import { HowItWorks } from '@/components/marketing/HowItWorks'
import { Testimonials } from '@/components/marketing/Testimonials'
import { BlogPreview } from '@/components/marketing/BlogPreview'
import { Pricing } from '@/components/marketing/Pricing'
import { Trust } from '@/components/marketing/Trust'
import { FAQ } from '@/components/marketing/FAQ'
import { FinalCTA } from '@/components/marketing/FinalCTA'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

/**
 * Marketing homepage. Previously rendered /public/ezly-marketing.html
 * inside an iframe, which caused mobile layout breakage and link-trap
 * bugs (links navigating only the iframe). Now composed from real
 * React/Tailwind sections so every internal link uses next/link and
 * the layout is genuinely responsive from 320px up.
 */
export default function Home() {
  return (
    <div className="bg-white text-gray-900 antialiased">
      <MarketingNav />
      <main>
        <Hero />
        <ProofBar />
        <ProblemSolution />
        <Features />
        <PhotoBand />
        <HowItWorks />
        <Testimonials />
        <BlogPreview />
        <Pricing />
        <Trust />
        <FAQ />
        <FinalCTA />
      </main>
      <MarketingFooter />
    </div>
  )
}
