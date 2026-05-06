-- Migration 004: Invoice infrastructure
-- Run in Supabase SQL editor

-- Sequential invoice number generator
CREATE OR REPLACE FUNCTION public.next_invoice_number(c_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num
  FROM public.invoices
  WHERE contractor_id = c_id;
  RETURN '#' || LPAD(next_num::TEXT, 4, '0');
END;
$$;

-- Ensure invoices table exists with all required columns
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.profiles(id) NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  job_id UUID REFERENCES public.jobs(id),
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  invoice_type TEXT NOT NULL DEFAULT 'one_time',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(12,2) NOT NULL DEFAULT 0,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  terms TEXT,
  public_token UUID NOT NULL DEFAULT gen_random_uuid(),
  milestone_label TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_interval TEXT,
  next_recurrence_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  qty DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'ea',
  rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  contractor_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contractors manage own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Public can view by token" ON public.invoices;
DROP POLICY IF EXISTS "Contractors manage own line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Contractors manage own payments" ON public.payments;

CREATE POLICY "Contractors manage own invoices" ON public.invoices
  FOR ALL USING (auth.uid() = contractor_id);

CREATE POLICY "Public can view by token" ON public.invoices
  FOR SELECT USING (true);

CREATE POLICY "Contractors manage own line items" ON public.invoice_line_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.contractor_id = auth.uid())
  );

CREATE POLICY "Public read line items" ON public.invoice_line_items
  FOR SELECT USING (true);

CREATE POLICY "Contractors manage own payments" ON public.payments
  FOR ALL USING (auth.uid() = contractor_id);
