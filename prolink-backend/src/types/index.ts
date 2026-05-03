// ─── API Response Shape ────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Authenticated Request ────────────────────────────────────────────────────

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'contractor' | 'admin';
  contractor_id?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// ─── Database Row Types ────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'contractor' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Contractor {
  id: string;
  profile_id: string;
  business_name: string;
  business_type: 'sole_proprietor' | 'llc' | 'corporation' | 'partnership' | null;
  ein: string | null;
  website: string | null;
  description: string | null;
  founded_year: number | null;
  employee_count: number | null;
  status: 'pending' | 'active' | 'suspended' | 'inactive';
  verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractorTrade {
  id: string;
  contractor_id: string;
  trade: string;
  years_experience: number | null;
  is_primary: boolean;
  created_at: string;
}

export interface ContractorServiceArea {
  id: string;
  contractor_id: string;
  state_code: string;
  county: string | null;
  zip_code: string | null;
  radius_miles: number | null;
  created_at: string;
}

export interface ContractorLicense {
  id: string;
  contractor_id: string;
  state_code: string;
  license_type: string;
  license_number: string;
  issuing_authority: string | null;
  issued_date: string | null;
  expiration_date: string | null;
  status: 'active' | 'expired' | 'suspended' | 'pending';
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractorInsurance {
  id: string;
  contractor_id: string;
  insurance_type: 'general_liability' | 'workers_comp' | 'professional' | 'commercial_auto' | 'umbrella';
  provider: string | null;
  policy_number: string | null;
  coverage_amount: number | null;
  expiration_date: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  contractor_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_code: string | null;
  zip_code: string | null;
  source: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientNote {
  id: string;
  client_id: string;
  contractor_id: string;
  note: string;
  created_at: string;
}

export interface Lead {
  id: string;
  contractor_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  trade_needed: string | null;
  project_description: string | null;
  address_line1: string | null;
  city: string | null;
  state_code: string | null;
  zip_code: string | null;
  estimated_budget: number | null;
  status: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'won' | 'lost';
  source: string | null;
  priority: 'low' | 'medium' | 'high';
  assigned_at: string | null;
  converted_at: string | null;
  converted_to_client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  contractor_id: string;
  activity_type: string;
  description: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  contractor_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  trade: string | null;
  status: 'draft' | 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  address_line1: string | null;
  city: string | null;
  state_code: string | null;
  zip_code: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  estimated_value: number | null;
  contract_signed: boolean;
  contract_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobMilestone {
  id: string;
  job_id: string;
  contractor_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_date: string | null;
  payment_amount: number | null;
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
  sort_order: number;
  created_at: string;
}

export interface JobPhoto {
  id: string;
  job_id: string;
  contractor_id: string;
  url: string;
  caption: string | null;
  photo_type: 'before' | 'progress' | 'after';
  taken_at: string | null;
  created_at: string;
}

export interface JobDocument {
  id: string;
  job_id: string;
  contractor_id: string;
  name: string;
  url: string;
  document_type: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  contractor_id: string;
  client_id: string | null;
  job_id: string | null;
  invoice_number: string;
  status: 'draft' | 'sent' | 'viewed' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string | null;
  due_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  terms: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  contractor_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
}

export interface Payment {
  id: string;
  invoice_id: string;
  contractor_id: string;
  amount: number;
  payment_method: string | null;
  stripe_payment_id: string | null;
  reference_number: string | null;
  notes: string | null;
  paid_at: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  contractor_id: string;
  client_id: string | null;
  job_id: string | null;
  subject: string | null;
  status: 'active' | 'archived' | 'closed';
  last_message_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  contractor_id: string;
  sender_id: string;
  body: string;
  message_type: 'text' | 'image' | 'document' | 'system';
  attachment_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
