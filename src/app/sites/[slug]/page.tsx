import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import PublicSite from './PublicSite'

export const revalidate = 60

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false } },
  )
}

async function fetchSite(slug: string) {
  const sb = anonClient()
  const { data } = await sb
    .from('contractor_websites')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()
  return data
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const site = await fetchSite(params.slug)
  if (!site) {
    return { title: 'Site not found', robots: { index: false } }
  }

  const title = site.seo_title
    || `${site.business_name}${site.service_areas ? ' — ' + site.service_areas : ''}`
  const description = site.seo_description
    || site.tagline
    || `Trusted local services from ${site.business_name}.${site.service_areas ? ' Serving ' + site.service_areas + '.' : ''}`
  const image = site.social_image_url || site.logo_url || undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: image ? [{ url: image }] : undefined,
      siteName: site.business_name,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function Page({ params }: { params: { slug: string } }) {
  const site = await fetchSite(params.slug)
  return <PublicSite slug={params.slug} initialSite={site} />
}
