export type ContactStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'unqualified'
  | 'do_not_contact'
  | string // table is text, allow anything stored

export type ImportedContractor = {
  id: string
  business_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  website: string | null
  license_number: string | null
  license_status: string | null
  specialties: string[] | null
  source: string | null
  contact_status: ContactStatus | null
  contact_date: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  scraped_at: string | null
  created_at: string
  updated_at: string
}

export type PipelineStage = {
  id: string
  key: string
  label: string
  position: number
  is_won: boolean
  is_lost: boolean
}

export type Deal = {
  id: string
  contractor_id: string
  stage_key: string
  owner_email: string | null
  value_cents: number
  probability: number
  expected_close_date: string | null
  lost_reason: string | null
  created_at: string
  updated_at: string
}

export type ActivityKind = 'note' | 'call' | 'email' | 'sms' | 'task' | 'meeting'

export type Activity = {
  id: string
  contractor_id: string
  deal_id: string | null
  kind: ActivityKind
  subject: string | null
  body: string | null
  completed: boolean
  due_at: string | null
  completed_at: string | null
  owner_email: string | null
  created_at: string
  updated_at: string
}

export type ContractorWithDeal = ImportedContractor & {
  deal: Deal | null
}

export type CRMStats = {
  total_contractors: number
  by_contact_status: Record<string, number>
  by_stage: Record<string, { count: number; value_cents: number }>
  open_tasks: number
  overdue_tasks: number
  recent_activity_count_7d: number
}
