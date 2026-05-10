import { NextRequest, NextResponse } from 'next/server'
import { requireUser, notFound } from '../../../../../../../lib/server-auth'

/** GET /api/v1/contracts/:id/versions/:v — single version */
export async function GET(req: NextRequest, { params }: { params: { id: string; v: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const vNum = parseInt(params.v, 10)
  if (Number.isNaN(vNum)) return NextResponse.json({ error: 'bad_request', message: 'Invalid version number' }, { status: 400 })

  const { data } = await supabase
    .from('contract_versions')
    .select('*')
    .eq('contract_id', params.id)
    .eq('version_number', vNum)
    .single()
  if (!data) return notFound('Version not found')
  return NextResponse.json({ data })
}
