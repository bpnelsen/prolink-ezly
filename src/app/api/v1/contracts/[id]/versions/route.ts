import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../../../../lib/server-auth'

/** GET /api/v1/contracts/:id/versions — list all versions for a contract */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const { data, error } = await supabase
    .from('contract_versions')
    .select('*')
    .eq('contract_id', params.id)
    .order('version_number', { ascending: false })
  if (error) return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
