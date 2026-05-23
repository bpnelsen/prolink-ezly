import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, serverError } from '@/lib/server-auth'
import type { CRMStats } from '@/lib/crm-types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  // Run everything in parallel — these are independent reads.
  const [
    totalRes,
    contactStatusRes,
    dealsRes,
    openTasksRes,
    overdueTasksRes,
    recentRes,
  ] = await Promise.all([
    supabase.from('imported_contractors').select('id', { count: 'exact', head: true }),
    supabase.from('imported_contractors').select('contact_status'),
    supabase.from('crm_deals').select('stage_key, value_cents'),
    supabase.from('crm_activities').select('id', { count: 'exact', head: true })
      .eq('completed', false).in('kind', ['task', 'call', 'meeting']),
    supabase.from('crm_activities').select('id', { count: 'exact', head: true })
      .eq('completed', false).in('kind', ['task', 'call', 'meeting'])
      .lt('due_at', new Date().toISOString()),
    supabase.from('crm_activities').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()),
  ])

  const firstErr =
    totalRes.error || contactStatusRes.error || dealsRes.error
    || openTasksRes.error || overdueTasksRes.error || recentRes.error
  if (firstErr) return serverError(firstErr.message)

  const by_contact_status: Record<string, number> = {}
  for (const row of contactStatusRes.data || []) {
    const k = row.contact_status || 'unset'
    by_contact_status[k] = (by_contact_status[k] || 0) + 1
  }

  const by_stage: Record<string, { count: number; value_cents: number }> = {}
  for (const row of dealsRes.data || []) {
    const k = row.stage_key
    if (!by_stage[k]) by_stage[k] = { count: 0, value_cents: 0 }
    by_stage[k].count += 1
    by_stage[k].value_cents += row.value_cents || 0
  }

  const stats: CRMStats = {
    total_contractors: totalRes.count || 0,
    by_contact_status,
    by_stage,
    open_tasks: openTasksRes.count || 0,
    overdue_tasks: overdueTasksRes.count || 0,
    recent_activity_count_7d: recentRes.count || 0,
  }
  return NextResponse.json(stats)
}
