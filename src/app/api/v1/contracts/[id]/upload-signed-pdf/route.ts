import { NextRequest, NextResponse } from 'next/server'
import { requireUser, badRequest, notFound, serverError, serviceClient } from '../../../../../../lib/server-auth'
import { STORAGE_BUCKET } from '../../../../../../lib/contract-service'

const MAX_BYTES = 25 * 1024 * 1024

/**
 * POST /api/v1/contracts/:id/upload-signed-pdf
 * Body: multipart/form-data with a 'file' field (PDF, max 25MB).
 * Stores the signed PDF on the current contract_versions row.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const form = await req.formData().catch(() => null)
  if (!form) return badRequest('Expected multipart/form-data with a "file" field')

  const file = form.get('file')
  if (!(file instanceof Blob)) return badRequest('Missing "file" field')
  if (file.type && file.type !== 'application/pdf') return badRequest('File must be a PDF')
  if (file.size > MAX_BYTES) return badRequest(`File exceeds ${MAX_BYTES} bytes`)

  const { data: contract } = await supabase
    .from('contracts').select('current_version').eq('id', params.id).single()
  if (!contract) return notFound('Contract not found')

  // Upload via service role so the storage write isn't subject to per-user policies.
  const svc = serviceClient()
  const path = `${params.id}/signed/v${contract.current_version}.pdf`
  const bytes = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await svc.storage.from(STORAGE_BUCKET).upload(path, bytes, {
    upsert: true,
    contentType: 'application/pdf',
  })
  if (upErr) return serverError('Storage upload failed', upErr.message)
  const url = svc.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl

  // Write back to the current version row
  const { data: version, error: vErr } = await svc
    .from('contract_versions')
    .update({ signed_pdf_url: url })
    .eq('contract_id', params.id)
    .eq('version_number', contract.current_version)
    .select('*')
    .single()
  if (vErr) return serverError('Failed to record signed PDF URL', vErr.message)

  return NextResponse.json({ data: { signed_pdf_url: url, version } })
}
