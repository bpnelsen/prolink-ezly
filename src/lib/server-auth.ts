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
