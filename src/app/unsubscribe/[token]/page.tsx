import { serviceClient } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

// Public unsubscribe landing. Loads via a per-recipient token embedded in the
// campaign email footer; flips the matching contractor to do_not_contact and
// stamps the recipient row as unsubscribed. Server-rendered with no client JS
// so it works even if the visitor has scripting disabled.
export default async function UnsubscribePage({ params }: { params: { token: string } }) {
  const result = await unsubscribeByToken(params.token)

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6 py-12">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center space-y-4">
        {result.ok ? (
          <>
            <h1 className="text-xl font-bold text-gray-900">You're unsubscribed</h1>
            <p className="text-sm text-gray-600">
              {result.businessName
                ? <>We've removed <span className="font-semibold">{result.businessName}</span> from our outreach list.</>
                : <>We've removed you from our outreach list.</>}
              {' '}You won't receive further emails from us.
            </p>
            <p className="text-xs text-gray-400 pt-2">
              Reached this page by mistake? Email us back and we'll fix it.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900">Link expired</h1>
            <p className="text-sm text-gray-600">
              We couldn't find that unsubscribe record. The link may have expired,
              or you may have already unsubscribed. Either way — we won't email you again.
            </p>
          </>
        )}
      </div>
    </main>
  )
}

async function unsubscribeByToken(token: string): Promise<{ ok: boolean; businessName?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { ok: false }

  let svc
  try { svc = serviceClient() } catch { return { ok: false } }

  const { data: recipient } = await svc
    .from('crm_campaign_recipients')
    .select('id, contractor_id, status')
    .eq('unsubscribe_token', token)
    .maybeSingle()
  if (!recipient) return { ok: false }

  const now = new Date().toISOString()

  await svc
    .from('crm_campaign_recipients')
    .update({ status: 'unsubscribed', unsubscribed_at: now })
    .eq('id', recipient.id)

  const { data: contractor } = await svc
    .from('imported_contractors')
    .update({ contact_status: 'do_not_contact' })
    .eq('id', recipient.contractor_id)
    .select('business_name')
    .maybeSingle()

  return { ok: true, businessName: contractor?.business_name || undefined }
}
