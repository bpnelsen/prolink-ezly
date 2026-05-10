import { NextRequest, NextResponse } from 'next/server'
import { requireUser, notFound, forbidden, serverError } from '../../../../../../lib/server-auth'
import { createSignWellDocument, isSignWellEnabled } from '../../../../../../lib/signwell'

/**
 * POST /api/v1/contracts/:id/send
 * Transitions a draft contract to 'sent'. While SIGNWELL_ENABLED=false this
 * still creates the placeholder document record and seeds wet-ink signature
 * rows so the manual signing flow can take over. When the flag flips on, the
 * same code path produces real SignWell documents — no caller changes needed.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const { data: contract } = await supabase
    .from('contracts')
    .select('*, clients(first_name, last_name, email)')
    .eq('id', params.id)
    .single()
  if (!contract) return notFound('Contract not found')
  if (contract.status !== 'draft') return forbidden(`Contract is already ${contract.status}.`)

  const { data: contractor } = await supabase
    .from('customers')
    .select('business_name')
    .eq('id', user.id)
    .single()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  // Build signers
  const clientRec = (contract as { clients?: { first_name?: string; last_name?: string; email?: string } }).clients
  const ownerName = clientRec ? `${clientRec.first_name || ''} ${clientRec.last_name || ''}`.trim() : 'Owner'
  const contractorName = contractor?.business_name || profile?.full_name || 'Contractor'
  const signers = [
    { role: 'owner' as const, name: ownerName, email: clientRec?.email || '' },
    { role: 'contractor' as const, name: contractorName, email: profile?.email || '' },
  ]

  let createResult
  try {
    createResult = await createSignWellDocument({ id: contract.id, contract_number: contract.contract_number }, null, signers)
  } catch (e) {
    return serverError('Failed to create signing document', String(e))
  }

  const live = isSignWellEnabled()
  const signatureMethod = live ? 'signwell' : 'wet_ink_upload'
  const signwellStatus = live ? 'sent' : 'manual_pending'

  // Insert signature rows (idempotent: skip if any already exist)
  const { data: existingSigs } = await supabase
    .from('contract_signatures').select('id').eq('contract_id', contract.id)
  if (!existingSigs || existingSigs.length === 0) {
    const rows = signers.map(s => ({
      contract_id: contract.id,
      signer_role: s.role,
      signer_name: s.name,
      signer_email: s.email || null,
      signature_method: signatureMethod,
      signing_url: createResult.signingUrls[s.role] || null,
    }))
    const { error: sigErr } = await supabase.from('contract_signatures').insert(rows)
    if (sigErr) return serverError('Failed to seed signature rows', sigErr.message)
  }

  const { data: updated, error: upErr } = await supabase
    .from('contracts')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      signwell_document_id: createResult.documentId,
      signwell_status: signwellStatus,
    })
    .eq('id', contract.id)
    .select('*')
    .single()
  if (upErr) return serverError('Failed to send contract', upErr.message)

  return NextResponse.json({ data: updated, signing_mode: live ? 'signwell' : 'manual' })
}
