import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '../../../../../lib/signwell'

/**
 * POST /api/v1/webhooks/signwell
 *
 * Phase-4a scaffold. The route is live and verifies HMAC signatures against
 * SIGNWELL_WEBHOOK_SECRET. Event handling is deferred until SIGNWELL_ENABLED
 * flips on — see the TODO block below.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.SIGNWELL_WEBHOOK_SECRET || ''
  if (!secret) {
    return NextResponse.json(
      { error: 'webhook_not_configured', message: 'SIGNWELL_WEBHOOK_SECRET is not set.' },
      { status: 501 }
    )
  }

  const raw = await req.text()
  const sig = req.headers.get('x-signwell-signature') || req.headers.get('X-Signwell-Signature') || ''
  if (!verifyWebhookSignature(raw, sig, secret)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let payload: unknown = null
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  console.log('[signwell webhook]', payload)

  // TODO: implement when SIGNWELL_ENABLED=true
  //
  // Expected event types (SignWell docs):
  //   - document_signed       → set contract_signatures.signed_at, ip, ua for the signer
  //                             flip contract.status to 'partially_signed'
  //   - document_completed    → set contract.status='executed', executed_at=now()
  //                             store final signed PDF URL on contract_versions.signed_pdf_url
  //                             fire post-execution hooks (notifications phase)
  //   - document_declined     → set signwell_status='declined', contract.status='cancelled'
  //   - document_voided       → set signwell_status='voided', contract.status='cancelled'
  //
  // Must be idempotent — SignWell will retry on non-2xx. Key on the event id.

  return NextResponse.json({ ok: true })
}
