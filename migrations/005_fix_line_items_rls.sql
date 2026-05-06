-- Fix RLS policies on invoice_line_items so items are visible to contractors and public portal

-- Enable RLS if not already enabled
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe if they don't exist)
DROP POLICY IF EXISTS "Contractors manage own line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Public read line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Contractors can manage their line items" ON public.invoice_line_items;

-- Contractors can read/write their own invoice line items
CREATE POLICY "Contractors manage own line items"
  ON public.invoice_line_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.contractor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.contractor_id = auth.uid()
    )
  );

-- Public (anon) can read line items for any invoice — needed for the customer portal
CREATE POLICY "Public read line items"
  ON public.invoice_line_items
  FOR SELECT
  USING (true);
