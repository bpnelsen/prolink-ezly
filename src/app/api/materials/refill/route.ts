import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import { refillPriceBook } from '../../jack/tools'

export const dynamic = 'force-dynamic'

// POST /api/materials/refill — populate the price book from the contractor's
// past quote line items (most recent rate per item, skipping ones already in
// the book). RLS-scoped to the caller. Backs the Settings → Price Book button.
export async function POST(req: NextRequest) {
  const authed = await requireUser(req)
  if ('error' in authed) return authed.error

  try {
    const { added } = await refillPriceBook(authed.supabase, authed.user.id, { commit: true })
    return NextResponse.json({ ok: true, added })
  } catch (err) {
    console.error('Price book refill error:', err)
    return NextResponse.json({ ok: false, message: 'Could not refill the price book.' }, { status: 200 })
  }
}
