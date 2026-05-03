-- ============================================================
-- Prolink Database Schema
-- All timestamps UTC. state_code always 2-char uppercase.
-- RLS enabled on every table.
-- ============================================================

-- ─── Auth / Identity ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'contractor' CHECK (role IN ('contractor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: owner read" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles: owner update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ─── Contractors ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type TEXT CHECK (business_type IN ('sole_proprietor', 'llc', 'corporation', 'partnership')),
  ein TEXT,
  website TEXT,
  description TEXT,
  founded_year INT,
  employee_count INT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractors: owner read" ON contractors
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "contractors: owner update" ON contractors
  FOR UPDATE USING (auth.uid() = profile_id);

-- ─── Contractor Trades ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contractor_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  trade TEXT NOT NULL,
  years_experience INT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contractor_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractor_trades: owner all" ON contractor_trades
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

-- ─── Service Areas ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contractor_service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  state_code CHAR(2) NOT NULL,
  county TEXT,
  zip_code TEXT,
  radius_miles INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contractor_service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractor_service_areas: owner all" ON contractor_service_areas
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

-- ─── Licenses ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contractor_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  state_code CHAR(2) NOT NULL,
  license_type TEXT NOT NULL,
  license_number TEXT NOT NULL,
  issuing_authority TEXT,
  issued_date DATE,
  expiration_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'pending')),
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contractor_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractor_licenses: owner all" ON contractor_licenses
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

-- ─── Insurance ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contractor_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  insurance_type TEXT NOT NULL CHECK (insurance_type IN ('general_liability', 'workers_comp', 'professional', 'commercial_auto', 'umbrella')),
  provider TEXT,
  policy_number TEXT,
  coverage_amount NUMERIC(12,2),
  expiration_date DATE,
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contractor_insurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractor_insurance: owner all" ON contractor_insurance
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

-- ─── Clients ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_code CHAR(2),
  zip_code TEXT,
  source TEXT,
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients: owner all" ON clients
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_notes: owner all" ON client_notes
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

-- ─── Leads ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  trade_needed TEXT,
  project_description TEXT,
  address_line1 TEXT,
  city TEXT,
  state_code CHAR(2),
  zip_code TEXT,
  estimated_budget NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost')),
  source TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  converted_to_client_id UUID REFERENCES clients(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads: owner all" ON leads
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS lead_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lead_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_activity: owner all" ON lead_activity
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

-- ─── Jobs ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  title TEXT NOT NULL,
  description TEXT,
  trade TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  address_line1 TEXT,
  city TEXT,
  state_code CHAR(2),
  zip_code TEXT,
  scheduled_start DATE,
  scheduled_end DATE,
  actual_start DATE,
  actual_end DATE,
  estimated_value NUMERIC(12,2),
  contract_signed BOOLEAN DEFAULT FALSE,
  contract_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs: owner all" ON jobs
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS job_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_date DATE,
  payment_amount NUMERIC(12,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'approved')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE job_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_milestones: owner all" ON job_milestones
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  photo_type TEXT DEFAULT 'progress' CHECK (photo_type IN ('before', 'progress', 'after')),
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_photos: owner all" ON job_photos
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS job_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  document_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE job_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_documents: owner all" ON job_documents
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

-- ─── Invoices ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  job_id UUID REFERENCES jobs(id),
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  issue_date DATE,
  due_date DATE,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,4) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) DEFAULT 0,
  balance_due NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (contractor_id, invoice_number)
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices: owner all" ON invoices
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  sort_order INT DEFAULT 0
);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_line_items: owner all" ON invoice_line_items
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT,
  stripe_payment_id TEXT,
  reference_number TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments: owner all" ON payments
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

-- ─── Messaging ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  job_id UUID REFERENCES jobs(id),
  subject TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations: owner all" ON conversations
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'system')),
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages: owner all" ON messages
  FOR ALL USING (
    contractor_id IN (SELECT id FROM contractors WHERE profile_id = auth.uid())
  );

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_contractors_profile_id ON contractors(profile_id);
CREATE INDEX IF NOT EXISTS idx_clients_contractor_id ON clients(contractor_id);
CREATE INDEX IF NOT EXISTS idx_leads_contractor_id ON leads(contractor_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(contractor_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_contractor_id ON jobs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(contractor_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contractor_id ON invoices(contractor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(contractor_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- ─── Storage Buckets (run in Supabase dashboard or via management API) ─────────
-- Required buckets:
--   job-photos        (public: false)
--   job-documents     (public: false)
--   contractor-documents (public: false)
