import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, serverError } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  const { data, error } = await supabase
    .from('crm_pipeline_stages').select('*').order('position', { ascending: true })
  if (error) return serverError(error.message)
  return NextResponse.json({ stages: data || [] })
}
