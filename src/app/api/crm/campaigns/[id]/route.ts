import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, notFound, serverError } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAdmin(req)
  if ('error' in gate) return gate.error
  const { supabase } = gate

  const { data: campaign, error } = await supabase
    .from('crm_campaigns').select('*').eq('id', params.id).maybeSingle()
  if (error) return serverError(error.message)
  if (!campaign) return notFound('Campaign not found')

  const { data: recipients } = await supabase
    .from('crm_campaign_recipients')
    .select('*, contractor:imported_contractors(id, business_name, email, contact_status)')
    .eq('campaign_id', params.id)
    .order('status', { ascending: true })
    .limit(5000)

  return NextResponse.json({ campaign, recipients: recipients || [] })
}
