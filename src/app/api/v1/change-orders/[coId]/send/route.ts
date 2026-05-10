import { NextRequest, NextResponse } from 'next/server'
import { requireUser, notFound, forbidden, serverError } from '../../../../../../lib/server-auth'
import { createSignWellDocument, isSignWellEnabled } from '../../../../../../lib/signwell'

/** POST /api/v1/change-orders/:coId/send */
export async function POST(req: NextRequest, { params }: { params: { coId: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const { data: co } = await supabase.from('change_orders').select('*').eq('id', params.coId).single()
  if (!co) return notFound('Change order not found')
  if (co.status !== 'draft') return forbidden(`Change order is already ${co.status}.`)

  const live = isSignWellEnabled()
  const createResult = await createSignWellDocument({ id: co.id }, null, [])
  const swStatus = live ? 'sent' : 'manual_pending'

  const { data, error } = await supabase
    .from('change_orders')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      signwell_document_id: createResult.documentId,
      signwell_status: swStatus,
    })
    .eq('id', co.id)
    .select('*')
    .single()
  if (error) return serverError('Failed to send change order', error.message)
  return NextResponse.json({ data, signing_mode: live ? 'signwell' : 'manual' })
}
