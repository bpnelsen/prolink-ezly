// Shared Customer Hub vocabulary + presentation helpers.

export const LIFECYCLE_STATUSES = ['lead', 'prospect', 'active', 'inactive', 'lost'] as const
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number]

export const LIFECYCLE_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  lead:     { label: 'Lead',     bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  prospect: { label: 'Prospect', bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  active:   { label: 'Active',   bg: 'bg-green-50',   text: 'text-green-700',   dot: 'bg-green-500' },
  inactive: { label: 'Inactive', bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400' },
  lost:     { label: 'Lost',     bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-400' },
}

export const LEAD_SOURCES = ['referral', 'website', 'google', 'repeat', 'social', 'other'] as const

export const DEAL_STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const
export const DEAL_STAGE_META: Record<string, { label: string; bg: string; text: string }> = {
  lead:        { label: 'Lead',        bg: 'bg-gray-100',  text: 'text-gray-600' },
  qualified:   { label: 'Qualified',   bg: 'bg-blue-50',   text: 'text-blue-700' },
  proposal:    { label: 'Proposal',    bg: 'bg-indigo-50', text: 'text-indigo-700' },
  negotiation: { label: 'Negotiation', bg: 'bg-amber-50',  text: 'text-amber-700' },
  won:         { label: 'Won',         bg: 'bg-green-50',  text: 'text-green-700' },
  lost:        { label: 'Lost',        bg: 'bg-red-50',    text: 'text-red-600' },
}

export const ACTIVITY_META: Record<string, { label: string; icon: string }> = {
  note:    { label: 'Note',    icon: 'StickyNote' },
  call:    { label: 'Call',    icon: 'Phone' },
  email:   { label: 'Email',   icon: 'Mail' },
  sms:     { label: 'SMS',     icon: 'MessageSquare' },
  meeting: { label: 'Meeting', icon: 'Calendar' },
  system:  { label: 'System',  icon: 'Activity' },
}

export const ADDRESS_LABELS = ['service', 'billing', 'mailing', 'other'] as const

export function titleCase(s: string | null | undefined): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}
