import { NextRequest, NextResponse } from 'next/server'
import { requireUser, notFound, serverError } from '../../../../../../lib/server-auth'

export const runtime = 'nodejs'

/**
 * POST /api/v1/clients/:id/portal-invite
 * Contractor issues a portal claim link for one of their clients. Returns
 * the claim URL (and best-effort emails it to the client via Resend).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if ('error' in auth) return auth.error
  const { user, supabase } = auth

  // clients RLS scopes this to the calling contractor.
  const { data: client } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email')
    .eq('id', params.id)
    .maybeSingle()
  if (!client) return notFound('Client not found')

  const { data: invite, error } = await supabase
    .from('client_portal_invites')
    .insert({ contractor_id: user.id, client_id: client.id, email: client.email })
    .select('token')
    .single()
  if (error) return serverError('Could not create invite', error.message)

  const base = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
  const claimUrl = `${base}/portal/claim/${invite.token}`

  let emailed = false
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey && client.email) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(apiKey)
      const from = process.env.CONTACT_FROM_EMAIL || 'Prolink <onboarding@resend.dev>'
      const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'there'
      const { error: sendErr } = await resend.emails.send({
        from,
        to: client.email,
        subject: 'Your customer portal access',
        text: `Hi ${name},\n\nYou've been invited to your customer portal — view invoices, messages, and contracts in one place.\n\nGet started: ${claimUrl}\n\nThis link is unique to you; please don't share it.`,
      })
      emailed = !sendErr
    } catch {
      emailed = false
    }
  }

  return NextResponse.json({ data: { url: claimUrl, emailed } }, { status: 201 })
}
