import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, badRequest, serverError } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() || ''
  const stateFilter = url.searchParams.get('state')?.trim() || ''
  const contactStatus = url.searchParams.get('contact_status')?.trim() || ''
  const stage = url.searchParams.get('stage')?.trim() || ''
  const order = (url.searchParams.get('order') || 'created_at') as
    'created_at' | 'business_name' | 'updated_at'
  const dir = (url.searchParams.get('dir') || 'desc') as 'asc' | 'desc'
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 50), 1), 500)
  const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0)

  let query = supabase
    .from('imported_contractors')
    .select('*, deal:crm_deals(*)', { count: 'exact' })

  if (q) {
    // pg_trgm GIN index handles fuzzy matching; ILIKE is the consumer.
    query = query.ilike('business_name', `%${q}%`)
  }
  if (stateFilter) query = query.eq('state', stateFilter)
  if (contactStatus) query = query.eq('contact_status', contactStatus)

  query = query.order(order, { ascending: dir === 'asc' }).range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) return serverError(error.message)

  let items = (data || []).map((row: any) => ({
    ...row,
    deal: Array.isArray(row.deal) ? row.deal[0] || null : row.deal || null,
  }))

  if (stage) {
    items = items.filter((c: any) => c.deal?.stage_key === stage)
  }

  return NextResponse.json({ items, total: count ?? items.length })
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  if (!body || typeof body !== 'object') return badRequest('Body must be an object')

  const allowed = [
    'business_name', 'phone', 'email', 'address', 'city', 'state', 'zip',
    'website', 'license_number', 'license_status', 'specialties', 'source',
    'contact_status', 'contact_date', 'notes', 'metadata',
  ]
  const payload: Record<string, unknown> = { id: crypto.randomUUID() }
  for (const k of allowed) if (k in body) payload[k] = body[k]

  if (!payload.business_name) return badRequest('business_name is required')

  const { data, error } = await supabase
    .from('imported_contractors')
    .insert(payload)
    .select('*')
    .single()
  if (error) return serverError(error.message)

  return NextResponse.json({ contractor: data })
}
