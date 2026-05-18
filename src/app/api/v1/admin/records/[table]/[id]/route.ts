import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, badRequest, serverError } from '../../../../../../../lib/server-auth'

// Strict allowlist — never interpolate an arbitrary caller-supplied table name.
const DELETABLE = new Set(['clients', 'jobs', 'invoices', 'technicians', 'contractor_websites'])

/** DELETE /api/v1/admin/records/:table/:id — delete one allowlisted record. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { table: string; id: string } }
) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  if (!DELETABLE.has(params.table)) return badRequest('Unsupported table')
  if (!params.id) return badRequest('Missing record id')

  const { error } = await auth.supabase.from(params.table).delete().eq('id', params.id)
  if (error) return serverError('Delete failed', error.message)
  return NextResponse.json({ data: { deleted: true } })
}
