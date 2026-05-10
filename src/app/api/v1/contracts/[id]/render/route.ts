import { NextRequest, NextResponse } from 'next/server'
import { requireUser, notFound, serverError } from '../../../../../../lib/server-auth'
import { renderAndStoreVersion } from '../../../../../../lib/contract-service'

/** POST /api/v1/contracts/:id/render — re-render current contract as a new version */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const { data: existing } = await supabase
    .from('contracts').select('id').eq('id', params.id).single()
  if (!existing) return notFound('Contract not found')

  try {
    const result = await renderAndStoreVersion(params.id, 'edit')
    return NextResponse.json({ data: result })
  } catch (e) {
    return serverError('Failed to render contract', String(e))
  }
}
