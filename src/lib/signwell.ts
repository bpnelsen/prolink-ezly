/**
 * SignWell integration — scaffolded, not active.
 *
 * Every entry point is gated behind SIGNWELL_ENABLED. When the flag is off
 * the stubs return deterministic placeholders so downstream code paths still
 * flow (the manual signing path takes over). When it flips on, fill in the
 * function bodies — no caller needs to change.
 *
 * HMAC verification is implemented for real now (small, stateless, free).
 */

import crypto from 'crypto'

export interface Signer {
  role: 'owner' | 'contractor'
  name: string
  email: string
}

export interface SignWellCreateResult {
  documentId: string
  signingUrls: Record<string, string>
}

export interface SignWellSignerStatus {
  role: 'owner' | 'contractor'
  email: string
  signed: boolean
  signed_at: string | null
}

export interface SignWellStatus {
  status: 'manual' | 'sent' | 'completed' | 'voided' | 'declined'
  signers: SignWellSignerStatus[]
}

export function isSignWellEnabled(): boolean {
  return process.env.SIGNWELL_ENABLED === 'true'
}

export async function createSignWellDocument(
  contract: { id: string; contract_number?: string },
  _pdfBuffer: Buffer | null,
  _signers: Signer[]
): Promise<SignWellCreateResult> {
  if (!isSignWellEnabled()) {
    return { documentId: `manual-${contract.id}`, signingUrls: {} }
  }
  throw new Error('SignWell live integration not yet implemented')
}

export async function sendForSignature(_documentId: string): Promise<void> {
  if (!isSignWellEnabled()) return
  throw new Error('SignWell live integration not yet implemented')
}

export async function getDocumentStatus(documentId: string): Promise<SignWellStatus> {
  if (!isSignWellEnabled()) {
    return {
      status: documentId.startsWith('manual-') ? 'manual' : 'sent',
      signers: [],
    }
  }
  throw new Error('SignWell live integration not yet implemented')
}

export async function voidDocument(_documentId: string, _reason: string): Promise<void> {
  if (!isSignWellEnabled()) return
  throw new Error('SignWell live integration not yet implemented')
}

/**
 * Verify a SignWell webhook signature. Real HMAC-SHA256 over the raw body
 * using SIGNWELL_WEBHOOK_SECRET as the key. Constant-time comparison.
 */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const sigBuf = Buffer.from(signature, 'hex')
  const cmpBuf = Buffer.from(computed, 'hex')
  if (sigBuf.length !== cmpBuf.length) return false
  try {
    return crypto.timingSafeEqual(sigBuf, cmpBuf)
  } catch {
    return false
  }
}
