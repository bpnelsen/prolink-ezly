-- 5. Add RLS Policies for multi-tenant security
-- (Only run these if RLS is enabled)

-- Users can read/write their own contractor profile
CREATE POLICY "Users can manage own contractor profile" ON public.pl_contractors
  FOR ALL USING (auth.uid() = id);

-- Contractors can read/write their own pipeline data/leads
CREATE POLICY "Contractors can manage own pipeline" ON public.pl_pipelines
  FOR ALL USING (contractor_id = auth.uid());

-- Contractors can read their own vetting records
CREATE POLICY "Contractors can read own vetting" ON public.pl_vetting_records
  FOR SELECT USING (contractor_id = auth.uid());
