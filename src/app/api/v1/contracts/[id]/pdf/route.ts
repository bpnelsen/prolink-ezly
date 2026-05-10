import { NextRequest, NextResponse } from 'next/server'
import { requireUser, notFound } from '../../../../../../lib/server-auth'

/** GET /api/v1/contracts/:id/pdf — redirect to the current version's PDF URL */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const { data: contract } = await supabase
    .from('contracts').select('current_version').eq('id', params.id).single()
  if (!contract) return notFound('Contract not found')

  const { data: version } = await supabase
    .from('contract_versions')
    .select('pdf_url')
    .eq('contract_id', params.id)
    .eq('version_number', contract.current_version)
    .single()

  if (!version?.pdf_url) return notFound('Rendered version not found')
  return NextResponse.redirect(version.pdf_url, 302)
}
