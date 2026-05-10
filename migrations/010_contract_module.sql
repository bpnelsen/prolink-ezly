-- Migration 010: Contract module
-- Tables: contract_templates, contracts, contract_versions, contract_signatures, change_orders
-- Seeds: v1 owner_contractor template
-- Run in Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- contract_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL,           -- 'owner_contractor' | 'change_order'
  jurisdiction_state TEXT,               -- NULL = applies to all
  version INTEGER NOT NULL DEFAULT 1,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  retired_date DATE,
  content JSONB NOT NULL,                -- { title, articles: [{ heading, body }], signatures: [...] }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_lookup
  ON public.contract_templates(template_type, jurisdiction_state, effective_date);

-- ---------------------------------------------------------------------------
-- contracts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.profiles(id) NOT NULL,
  job_id UUID REFERENCES public.jobs(id) NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  template_id UUID REFERENCES public.contract_templates(id),

  contract_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',           -- draft | sent | partially_signed | executed | cancelled
  signwell_document_id TEXT,
  signwell_status TEXT,                            -- 'manual_pending' | 'sent' | 'completed' | 'voided' | 'manual'

  contract_sum DECIMAL(14,2) NOT NULL DEFAULT 0,
  deposit_pct DECIMAL(5,4) NOT NULL DEFAULT 0.10,
  retainage_pct DECIMAL(5,4) NOT NULL DEFAULT 0.10,
  application_due_day INTEGER NOT NULL DEFAULT 25,
  payment_due_days INTEGER NOT NULL DEFAULT 10,
  late_interest_rate_annual DECIMAL(5,4) NOT NULL DEFAULT 0.08,
  dispute_method TEXT NOT NULL DEFAULT 'mediation_then_arbitration',
  governing_law_state TEXT,

  start_date DATE,
  substantial_completion_date DATE,
  current_version INTEGER NOT NULL DEFAULT 1,
  public_token UUID NOT NULL DEFAULT gen_random_uuid(),

  sent_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_contractor_id ON public.contracts(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_job_id ON public.contracts(job_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_number_per_contractor
  ON public.contracts(contractor_id, contract_number);

-- ---------------------------------------------------------------------------
-- contract_versions  (the rendered/uploaded PDF for each version of a contract)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'initial',  -- 'initial' | 'edit' | 'change_order'
  change_order_id UUID,                     -- FK added after change_orders table
  pdf_url TEXT,                             -- rendered (unsigned) PDF
  signed_pdf_url TEXT,                      -- wet-ink-uploaded signed PDF
  snapshot JSONB NOT NULL,                  -- frozen copy of contract+template at this version
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_versions_contract_id
  ON public.contract_versions(contract_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contract_versions_unique
  ON public.contract_versions(contract_id, version_number);

-- ---------------------------------------------------------------------------
-- contract_signatures  (one row per signer per contract)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  signer_role TEXT NOT NULL,                 -- 'owner' | 'contractor'
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signature_method TEXT NOT NULL DEFAULT 'wet_ink_upload',  -- 'wet_ink_upload' | 'signwell'
  signwell_signer_id TEXT,
  signing_url TEXT,
  signed_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  signature_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_signatures_contract_id
  ON public.contract_signatures(contract_id);

-- ---------------------------------------------------------------------------
-- change_orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  co_number TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_delta DECIMAL(14,2) NOT NULL DEFAULT 0,
  time_delta_days INTEGER NOT NULL DEFAULT 0,
  new_contract_sum DECIMAL(14,2) NOT NULL DEFAULT 0,
  new_completion_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',          -- draft | sent | executed | rejected | cancelled
  signwell_document_id TEXT,
  signwell_status TEXT,
  sent_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_change_orders_contract_id
  ON public.change_orders(contract_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_change_orders_number_per_contract
  ON public.change_orders(contract_id, co_number);

-- Add FK on contract_versions.change_order_id now that the table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contract_versions_change_order_id_fkey'
  ) THEN
    ALTER TABLE public.contract_versions
      ADD CONSTRAINT contract_versions_change_order_id_fkey
      FOREIGN KEY (change_order_id) REFERENCES public.change_orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Contract number generator: PL-{YYYY}-{4-digit sequence} per contractor per year
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_contract_number(c_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  yr TEXT;
  next_num INTEGER;
BEGIN
  yr := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO next_num
  FROM public.contracts
  WHERE contractor_id = c_id
    AND contract_number LIKE 'PL-' || yr || '-%';
  RETURN 'PL-' || yr || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$;

-- Change order number generator: CO-{3-digit sequence} per contract
CREATE OR REPLACE FUNCTION public.next_co_number(ct_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num
  FROM public.change_orders
  WHERE contract_id = ct_id;
  RETURN 'CO-' || LPAD(next_num::TEXT, 3, '0');
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.contract_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_versions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signatures   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_orders         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read templates"        ON public.contract_templates;
DROP POLICY IF EXISTS "Contractors manage own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Public can view contracts by token" ON public.contracts;
DROP POLICY IF EXISTS "Contractors manage own contract versions"   ON public.contract_versions;
DROP POLICY IF EXISTS "Public can view contract versions"          ON public.contract_versions;
DROP POLICY IF EXISTS "Contractors manage own contract signatures" ON public.contract_signatures;
DROP POLICY IF EXISTS "Public can view contract signatures"        ON public.contract_signatures;
DROP POLICY IF EXISTS "Contractors manage own change orders"       ON public.change_orders;

CREATE POLICY "Anyone can read templates" ON public.contract_templates
  FOR SELECT USING (true);

CREATE POLICY "Contractors manage own contracts" ON public.contracts
  FOR ALL USING (auth.uid() = contractor_id);

CREATE POLICY "Public can view contracts by token" ON public.contracts
  FOR SELECT USING (true);

CREATE POLICY "Contractors manage own contract versions" ON public.contract_versions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.contractor_id = auth.uid())
  );

CREATE POLICY "Public can view contract versions" ON public.contract_versions
  FOR SELECT USING (true);

CREATE POLICY "Contractors manage own contract signatures" ON public.contract_signatures
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.contractor_id = auth.uid())
  );

CREATE POLICY "Public can view contract signatures" ON public.contract_signatures
  FOR SELECT USING (true);

CREATE POLICY "Contractors manage own change orders" ON public.change_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND c.contractor_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Seed: v1 owner_contractor template
-- ---------------------------------------------------------------------------
INSERT INTO public.contract_templates (template_type, jurisdiction_state, version, effective_date, content)
SELECT 'owner_contractor', NULL, 1, CURRENT_DATE, $json$
{
  "title": "Owner-Contractor Construction Agreement",
  "intro": "This Agreement is made and entered into as of {{contract.start_date|date}} by and between {{computed.owner_full_name}} (\"Owner\") and {{contractor.business_name}} (\"Contractor\").",
  "parties": {
    "owner": {
      "heading": "Owner",
      "lines": ["{{computed.owner_full_name}}", "{{client.street_address}}", "{{client.city}}, {{client.state|state_name}} {{client.zip_code}}", "{{client.phone}}", "{{client.email}}"]
    },
    "contractor": {
      "heading": "Contractor",
      "lines": ["{{contractor.business_name}}", "{{computed.contractor_address_full}}", "License: {{contractorLicense.number}}", "{{contractor.phone}}"]
    }
  },
  "project": {
    "heading": "Project",
    "lines": ["Project Address: {{computed.project_address_full}}", "Start Date: {{contract.start_date|date}}", "Substantial Completion: {{contract.substantial_completion_date|date}}"]
  },
  "articles": [
    {
      "n": 1,
      "heading": "Scope of Work",
      "body": "Contractor shall furnish all labor, materials, equipment, and services necessary to complete the work described in the attached scope and any documents incorporated herein (collectively, the \"Work\")."
    },
    {
      "n": 2,
      "heading": "Contract Sum",
      "body": "Owner shall pay Contractor a total contract sum of {{contract.contract_sum|currency}} for the full and faithful performance of the Work, subject to additions and deductions by Change Order as provided herein."
    },
    {
      "n": 3,
      "heading": "Payment Terms",
      "body": "A deposit of {{contract.deposit_pct|percent}} ({{computed.deposit_amount|currency}}) is due upon execution of this Agreement. Progress payments shall be made against applications submitted by the {{contract.application_due_day|int}} of each month and shall be due within {{contract.payment_due_days|int}} days. Retainage of {{contract.retainage_pct|percent}} shall be withheld from each progress payment and released upon substantial completion."
    },
    {
      "n": 4,
      "heading": "Late Payment",
      "body": "Any payment not made when due shall accrue interest at the rate of {{contract.late_interest_rate_annual|percent}} per annum until paid in full."
    },
    {
      "n": 5,
      "heading": "Change Orders",
      "body": "Any change to the scope, contract sum, or completion date shall be documented in a written Change Order signed by both parties before the changed Work is performed."
    },
    {
      "n": 6,
      "heading": "Insurance & Licensing",
      "body": "Contractor warrants that it is duly licensed in the State of {{contract.governing_law_state|state_name}} and shall maintain general liability and workers' compensation insurance in commercially reasonable amounts throughout the term of the Work."
    },
    {
      "n": 7,
      "heading": "Warranty",
      "body": "Contractor warrants that the Work shall be free from defects in workmanship for a period of one (1) year following substantial completion."
    },
    {
      "n": 8,
      "heading": "Dispute Resolution",
      "body": "Any dispute arising under this Agreement shall be resolved by {{contract.dispute_method|humanize}}. This Agreement shall be governed by the laws of the State of {{contract.governing_law_state|state_name}}."
    },
    {
      "n": 9,
      "heading": "Entire Agreement",
      "body": "This Agreement, together with all exhibits and incorporated documents, constitutes the entire agreement between the parties and supersedes any prior negotiations or representations."
    }
  ],
  "exhibit_a": {
    "heading": "Exhibit A — Payment Schedule",
    "source": "milestones"
  },
  "signatures": [
    { "role": "owner",      "label": "Owner" },
    { "role": "contractor", "label": "Contractor" }
  ]
}
$json$::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.contract_templates
  WHERE template_type = 'owner_contractor' AND version = 1
);

-- ---------------------------------------------------------------------------
-- Storage bucket reminder (run once in Supabase dashboard if not present):
--   storage bucket: contract-documents  (public read OK; uploads via service role)
-- ---------------------------------------------------------------------------
