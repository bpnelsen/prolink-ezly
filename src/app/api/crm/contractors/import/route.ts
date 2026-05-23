import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, badRequest, serverError } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ALLOWED_KEYS = new Set([
  'business_name', 'phone', 'email', 'address', 'city', 'state', 'zip',
  'website', 'license_number', 'license_status', 'source', 'contact_status',
  'notes',
])

function normalize(row: Record<string, string>): Record<string, unknown> | null {
  const out: Record<string, unknown> = { id: crypto.randomUUID() }
  for (const [rawKey, rawVal] of Object.entries(row)) {
    const k = rawKey.trim().toLowerCase().replace(/\s+/g, '_')
    if (!ALLOWED_KEYS.has(k)) continue
    const v = (rawVal ?? '').toString().trim()
    if (v) out[k] = v
  }
  if (!out.business_name) return null
  return out
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const rows: Array<Record<string, string>> = Array.isArray(body?.rows) ? body.rows : []
  if (rows.length === 0) return badRequest('No rows supplied')
  if (rows.length > 5000) return badRequest('Max 5000 rows per import')

  const payload: Record<string, unknown>[] = []
  const errors: string[] = []
  rows.forEach((row, i) => {
    const n = normalize(row)
    if (!n) { errors.push(`Row ${i + 1}: missing business_name`); return }
    payload.push(n)
  })

  if (payload.length === 0) {
    return NextResponse.json({ inserted: 0, skipped: rows.length, errors })
  }

  // Chunk in 500s to keep the request under Supabase row limits.
  let inserted = 0
  for (let i = 0; i < payload.length; i += 500) {
    const slice = payload.slice(i, i + 500)
    const { error, count } = await supabase
      .from('imported_contractors').insert(slice, { count: 'exact' })
    if (error) return serverError(error.message)
    inserted += count ?? slice.length
  }

  return NextResponse.json({
    inserted,
    skipped: rows.length - inserted,
    errors,
  })
}
