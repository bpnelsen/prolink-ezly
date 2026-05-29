import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * Build a Supabase client bound to the caller's JWT (Authorization: Bearer …).
 * RLS will scope reads/writes to the calling user automatically.
 */
export function userClient(req: NextRequest): SupabaseClient {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: auth ? { Authorization: auth } : {} },
  })
}

/**
 * Whether the service-role key is configured. Lets callers branch to a clear,
 * actionable error before invoking `serviceClient()` (which throws).
 */
export function hasServiceRole(): boolean {
  return Boolean(SUPABASE_SERVICE_ROLE_KEY)
}

/**
 * Service-role client. Use sparingly — only for trusted server-only operations
 * (storage uploads, signed webhook handlers, etc.). NEVER expose to the browser.
 */
export function serviceClient(): SupabaseClient {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type AuthedUser = { id: string; email: string | null }

/**
 * Resolve the user from the Authorization header. Returns 401 NextResponse
 * if the token is missing or invalid; otherwise returns { user, supabase }.
 */
export async function requireUser(
  req: NextRequest
): Promise<{ user: AuthedUser; supabase: SupabaseClient } | { error: NextResponse }> {
  const supabase = userClient(req)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return {
      error: NextResponse.json({ error: 'unauthorized', message: 'Sign in required.' }, { status: 401 }),
    }
  }
  return {
    user: { id: data.user.id, email: data.user.email ?? null },
    supabase,
  }
}

/**
 * Server-side admin gate. Verifies the caller's JWT, then checks the
 * authenticated email against the allowlist (ADMIN_EMAILS, comma-separated;
 * defaults to the single known platform admin). On success returns a
 * service-role client — the trusted cross-tenant path now that RLS is
 * locked down. NEVER trust a client-supplied role/email for this.
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'bpnelsen@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export async function requireAdmin(
  req: NextRequest
): Promise<{ user: AuthedUser; supabase: SupabaseClient } | { error: NextResponse }> {
  const auth = await requireUser(req)
  if ('error' in auth) return auth
  const email = (auth.user.email || '').toLowerCase()
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return { error: forbidden('Admin access required.') }
  }
  return { user: auth.user, supabase: serviceClient() }
}

/**
 * Customer-portal gate. Verifies the caller's JWT, ensures a
 * client_portal_users row exists, and resolves the contractor-owned
 * `clients` ids this account has claimed (via client_links). Returns a
 * service-role client — portal data is fetched server-side scoped strictly
 * to `clientIds`, so no client-facing RLS is added to contractor tables.
 */
export async function requireClient(
  req: NextRequest
): Promise<
  | { user: AuthedUser; supabase: SupabaseClient; clientIds: string[] }
  | { error: NextResponse }
> {
  const auth = await requireUser(req)
  if ('error' in auth) return auth
  const svc = serviceClient()

  // Reject contractor accounts hitting the portal API.
  const { data: contractor } = await svc
    .from('profiles')
    .select('id')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (contractor) {
    return { error: forbidden('This is a contractor account, not a customer portal account.') }
  }

  // Ensure the portal account row exists (defensive if the signup trigger
  // didn't run, e.g. account_type metadata missing).
  await svc
    .from('client_portal_users')
    .upsert({ id: auth.user.id, email: auth.user.email }, { onConflict: 'id' })

  const { data: links } = await svc
    .from('client_links')
    .select('client_id')
    .eq('portal_user_id', auth.user.id)

  const clientIds = (links || []).map((l: { client_id: string }) => l.client_id)
  return { user: auth.user, supabase: svc, clientIds }
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: 'bad_request', message, details }, { status: 400 })
}
export function notFound(message = 'Not found') {
  return NextResponse.json({ error: 'not_found', message }, { status: 404 })
}
export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: 'forbidden', message }, { status: 403 })
}
export function serverError(message: string, details?: unknown) {
  return NextResponse.json({ error: 'server_error', message, details }, { status: 500 })
}
