import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../../lib/server-auth'

/**
 * GET /api/v1/contracts
 * List contracts for the authenticated contractor.
 * Optional ?status= filter.
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const statusFilter = new URL(req.url).searchParams.get('status')
  let q = supabase
    .from('contracts')
    .select('*, clients(first_name, last_name), jobs(title)')
    .order('created_at', { ascending: false })
  if (statusFilter) q = q.eq('status', statusFilter)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
