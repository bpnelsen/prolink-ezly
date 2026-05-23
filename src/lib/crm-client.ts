// Browser-side helpers for talking to /api/crm/*. Always sends the user's
// access token so the API route can run requireAdmin().

import { supabase } from './supabase-client'
import type {
  ImportedContractor, ContractorWithDeal, Deal, Activity, PipelineStage,
  CRMStats, ActivityKind,
} from './crm-types'

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {}
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
    ...(init.headers || {}),
  }
  const res = await fetch(path, { ...init, headers })
  if (!res.ok) {
    let detail = res.statusText
    try { detail = (await res.json())?.message || detail } catch {}
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

export type ContractorListParams = {
  q?: string
  state?: string
  contact_status?: string
  stage?: string
  limit?: number
  offset?: number
  order?: 'created_at' | 'business_name' | 'updated_at'
  dir?: 'asc' | 'desc'
}

export const crmAPI = {
  stats: () => request<CRMStats>('/api/crm/stats'),

  stages: () => request<{ stages: PipelineStage[] }>('/api/crm/stages'),

  contractors: {
    list: (params: ContractorListParams = {}) => {
      const qs = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v))
      })
      const s = qs.toString()
      return request<{ items: ContractorWithDeal[]; total: number }>(
        `/api/crm/contractors${s ? `?${s}` : ''}`
      )
    },
    get: (id: string) =>
      request<{ contractor: ImportedContractor; deal: Deal | null; activities: Activity[] }>(
        `/api/crm/contractors/${id}`
      ),
    patch: (id: string, patch: Partial<ImportedContractor>) =>
      request<{ contractor: ImportedContractor }>(`/api/crm/contractors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    create: (input: Partial<ImportedContractor>) =>
      request<{ contractor: ImportedContractor }>(`/api/crm/contractors`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    remove: (id: string) =>
      request<{ ok: true }>(`/api/crm/contractors/${id}`, { method: 'DELETE' }),
    importCSV: (rows: Array<Record<string, string>>) =>
      request<{ inserted: number; skipped: number; errors: string[] }>(
        `/api/crm/contractors/import`,
        { method: 'POST', body: JSON.stringify({ rows }) }
      ),
  },

  deals: {
    list: () => request<{ items: Deal[] }>('/api/crm/deals'),
    upsert: (contractor_id: string, patch: Partial<Deal>) =>
      request<{ deal: Deal }>(`/api/crm/deals`, {
        method: 'POST',
        body: JSON.stringify({ contractor_id, ...patch }),
      }),
    patch: (id: string, patch: Partial<Deal>) =>
      request<{ deal: Deal }>(`/api/crm/deals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    remove: (id: string) =>
      request<{ ok: true }>(`/api/crm/deals/${id}`, { method: 'DELETE' }),
  },

  activities: {
    list: (params: { contractor_id?: string; open_only?: boolean; limit?: number } = {}) => {
      const qs = new URLSearchParams()
      if (params.contractor_id) qs.set('contractor_id', params.contractor_id)
      if (params.open_only) qs.set('open_only', '1')
      if (params.limit) qs.set('limit', String(params.limit))
      const s = qs.toString()
      return request<{ items: Activity[] }>(`/api/crm/activities${s ? `?${s}` : ''}`)
    },
    create: (input: {
      contractor_id: string
      kind: ActivityKind
      subject?: string
      body?: string
      due_at?: string | null
    }) =>
      request<{ activity: Activity }>(`/api/crm/activities`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    patch: (id: string, patch: Partial<Activity>) =>
      request<{ activity: Activity }>(`/api/crm/activities/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    remove: (id: string) =>
      request<{ ok: true }>(`/api/crm/activities/${id}`, { method: 'DELETE' }),
  },
}

export function formatCurrencyCents(cents: number | null | undefined): string {
  if (cents == null) return '$0'
  const dollars = cents / 100
  return dollars.toLocaleString('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
