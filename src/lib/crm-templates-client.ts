import { supabase } from './supabase-client'
import type { CRMTemplate, TemplateKind } from './crm-templates'

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
    ...(init.headers || {}),
  }
  const res = await fetch(path, { ...init, headers })
  if (!res.ok) {
    let m = res.statusText
    try { m = (await res.json())?.message || m } catch {}
    throw new Error(m)
  }
  return res.json() as Promise<T>
}

export const templatesAPI = {
  list: (kind?: TemplateKind) =>
    req<{ items: CRMTemplate[] }>(`/api/crm/templates${kind ? `?kind=${kind}` : ''}`),
  create: (input: Pick<CRMTemplate, 'kind' | 'name' | 'body'> & { subject?: string | null }) =>
    req<{ template: CRMTemplate }>('/api/crm/templates', {
      method: 'POST', body: JSON.stringify(input),
    }),
  patch: (id: string, patch: Partial<Pick<CRMTemplate, 'name' | 'subject' | 'body'>>) =>
    req<{ template: CRMTemplate }>(`/api/crm/templates/${id}`, {
      method: 'PATCH', body: JSON.stringify(patch),
    }),
  remove: (id: string) =>
    req<{ ok: true }>(`/api/crm/templates/${id}`, { method: 'DELETE' }),
}

export const sendAPI = {
  email: (input: {
    contractor_id: string
    template_id?: string
    subject?: string
    body?: string
  }) => req<{ activity: unknown }>('/api/crm/send/email', {
    method: 'POST', body: JSON.stringify(input),
  }),
  dm: (input: {
    contractor_id: string
    template_id?: string
    subject?: string
    body?: string
  }) => req<{ activity: unknown; rendered: string }>('/api/crm/send/dm', {
    method: 'POST', body: JSON.stringify(input),
  }),
}
