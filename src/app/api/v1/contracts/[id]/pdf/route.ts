import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, notFound } from '../../../../../../lib/server-auth'

/**
 * GET /api/v1/contracts/:id/pdf
 *
 * Proxies the current version's rendered file back to the caller from
 * our own origin. We don't redirect to the Supabase Storage URL because
 * Supabase serves files with headers that block cross-origin iframe
 * embedding (`X-Frame-Options: SAMEORIGIN` etc.), and the contract
 * detail UI displays the file in an iframe.
 *
 * Access is gated by knowing the contract UUID — the same security
 * model as the public storage URL. No new exposure.
 *
 * Optional ?v=N to fetch a specific version.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const svc = serviceClient()

  const { data: contract } = await svc
    .from('contracts').select('current_version').eq('id', params.id).single()
  if (!contract) return notFound('Contract not found')

  const versionParam = new URL(req.url).searchParams.get('v')
  const versionNumber = versionParam ? parseInt(versionParam, 10) : contract.current_version
  if (Number.isNaN(versionNumber)) return notFound('Invalid version')

  const { data: version } = await svc
    .from('contract_versions')
    .select('pdf_url')
    .eq('contract_id', params.id)
    .eq('version_number', versionNumber)
    .single()
  if (!version?.pdf_url) return notFound('Rendered version not found')

  // Fetch from storage and stream back. Force inline display and the right
  // content-type with charset so the iframe renders instead of downloading
  // or mojibaking.
  const upstream = await fetch(version.pdf_url, { cache: 'no-store' })
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: 'upstream_fetch_failed', status: upstream.status },
      { status: 502 }
    )
  }

  const isHtml = version.pdf_url.endsWith('.html')
  const headers = new Headers()
  headers.set('Content-Type', isHtml ? 'text/html; charset=utf-8' : 'application/pdf')
  headers.set('Content-Disposition', 'inline')
  headers.set('Cache-Control', 'private, max-age=60')

  return new NextResponse(upstream.body, { status: 200, headers })
}
