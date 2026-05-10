/**
 * Tiny client-side helper that calls our /api/v1 routes with the user's
 * Supabase JWT attached.
 */
import { supabase } from './supabase-client'

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<{ data?: T; error?: string; message?: string; status: number }> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    ...(await authHeader()),
  }
  // Only set JSON Content-Type when the caller didn't pass FormData
  if (!(init.body instanceof FormData) && init.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(path, { ...init, headers })
  let body: { data?: T; error?: string; message?: string } = {}
  try { body = await res.json() } catch { /* empty body */ }
  return { ...body, status: res.status }
}
