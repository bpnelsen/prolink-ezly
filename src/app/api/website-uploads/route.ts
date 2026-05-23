import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient, badRequest, serverError } from '../../../lib/server-auth'

export const runtime = 'nodejs'

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
])

function extFor(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    case 'image/svg+xml':
      return 'svg'
    default:
      return 'bin'
  }
}

/**
 * Multipart upload for website logos + gallery photos.
 * Form fields:
 *   file:  the image file
 *   kind:  'logo' | 'gallery'
 *
 * Returns: { url, path }
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return badRequest('Expected multipart/form-data')
  }

  const file = form.get('file')
  const kind = String(form.get('kind') || 'gallery')

  if (!(file instanceof Blob)) return badRequest('Missing file')
  if (!ALLOWED_TYPES.has(file.type)) {
    return badRequest('Unsupported file type. Use JPG, PNG, WEBP, GIF or SVG.')
  }
  if (file.size > MAX_BYTES) {
    return badRequest('File too large. Max 8 MB.')
  }
  if (kind !== 'logo' && kind !== 'gallery') {
    return badRequest('Invalid kind')
  }

  const ext = extFor(file.type)
  const folder = kind === 'logo' ? 'logo' : 'gallery'
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const path = `${auth.user.id}/${folder}/${name}`

  const svc = serviceClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await svc.storage
    .from('website-assets')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    })
  if (upErr) return serverError('Upload failed', upErr.message)

  const { data: pub } = svc.storage.from('website-assets').getPublicUrl(path)
  return NextResponse.json({ url: pub.publicUrl, path })
}

/**
 * Delete a previously uploaded asset. Body: { path }.
 * Path must start with the caller's user id to prevent cross-tenant deletes.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error

  let body: { path?: string }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON')
  }

  const path = String(body.path || '')
  if (!path || !path.startsWith(`${auth.user.id}/`)) {
    return badRequest('Invalid path')
  }

  const svc = serviceClient()
  const { error } = await svc.storage.from('website-assets').remove([path])
  if (error) return serverError('Delete failed', error.message)
  return NextResponse.json({ ok: true })
}
