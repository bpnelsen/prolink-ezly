import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import { executeAction } from '../tools'

export const dynamic = 'force-dynamic'

// POST /api/foreman/action — execute an action the contractor approved in the
// Jack widget. The body is the Proposal the route previously returned. All
// writes are RLS-scoped to the caller; totals and ownership are re-verified in
// executeAction, so a tampered payload can't write outside the caller's account.
export async function POST(req: NextRequest) {
  const authed = await requireUser(req)
  if ('error' in authed) return authed.error
  const { user, supabase } = authed

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_request', message: 'Invalid JSON' }, { status: 400 })
  }

  const action = (body as { action?: unknown })?.action
  if (!action || typeof action !== 'object') {
    return NextResponse.json({ error: 'bad_request', message: 'action is required' }, { status: 400 })
  }

  let result
  try {
    result = await executeAction(supabase, user.id, action)
  } catch (err) {
    console.error('Jack action error:', err)
    return NextResponse.json({ ok: false, message: 'Something went wrong saving that.' }, { status: 200 })
  }

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 200 })
  }

  // Log the completed action into the contractor's Jack history.
  try {
    await supabase.from('foreman_messages').insert({ user_id: user.id, role: 'ai', content: `✅ ${result.summary}` })
  } catch (err) {
    console.error('Jack action persist error:', err)
  }

  return NextResponse.json({ ok: true, message: result.summary, link: result.link ?? null })
}
