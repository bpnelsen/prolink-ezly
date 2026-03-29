-- ============================================
-- 003: Job Contractors junction table + RLS
-- ============================================

-- 1. Add trade_type to jobs if missing
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS trade_type TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 2. Create the junction table
CREATE TABLE IF NOT EXISTS job_contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'bid_submitted', 'assigned', 'declined', 'removed')),
  bid_amount NUMERIC,
  bid_note TEXT,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bid_submitted_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  UNIQUE(job_id, contractor_id)
);

-- 3. Add contractor_id to reschedule_requests
ALTER TABLE reschedule_requests ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES profiles(id);

-- ============================================
-- RLS: jobs table
-- ============================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Contractors can only see jobs they've been invited to / assigned
-- Declined jobs visible for 3 days after decline, then hidden
CREATE POLICY "Contractors see their jobs"
  ON jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM job_contractors jc
      WHERE jc.job_id = jobs.id
        AND jc.contractor_id = auth.uid()
        AND (
          jc.status IN ('invited', 'bid_submitted', 'assigned')
          OR (jc.status = 'declined' AND jc.declined_at > NOW() - INTERVAL '3 days')
        )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert jobs
CREATE POLICY "Admins can create jobs"
  ON jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any job
CREATE POLICY "Admins can update jobs"
  ON jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- RLS: job_contractors table
-- ============================================
ALTER TABLE job_contractors ENABLE ROW LEVEL SECURITY;

-- Contractors see only their own rows
CREATE POLICY "Contractors see own job links"
  ON job_contractors FOR SELECT
  USING (
    contractor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Contractors can update their own rows (submit bid, decline)
CREATE POLICY "Contractors can update own job links"
  ON job_contractors FOR UPDATE
  USING (contractor_id = auth.uid())
  WITH CHECK (contractor_id = auth.uid());

-- Admins can insert (invite contractors)
CREATE POLICY "Admins can invite contractors"
  ON job_contractors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any row (assign, remove)
CREATE POLICY "Admins can update any job link"
  ON job_contractors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- RLS: reschedule_requests table
-- ============================================
ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;

-- Contractors see only their own reschedule requests
CREATE POLICY "Contractors see own reschedule requests"
  ON reschedule_requests FOR SELECT
  USING (
    contractor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Contractors can create reschedule requests
CREATE POLICY "Contractors can create reschedule requests"
  ON reschedule_requests FOR INSERT
  WITH CHECK (contractor_id = auth.uid());

-- ============================================
-- Function: Assign a contractor (auto-remove others)
-- ============================================
CREATE OR REPLACE FUNCTION assign_contractor(p_job_id UUID, p_contractor_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Mark the winner as assigned
  UPDATE job_contractors
  SET status = 'assigned', assigned_at = NOW()
  WHERE job_id = p_job_id AND contractor_id = p_contractor_id;

  -- Mark everyone else as removed
  UPDATE job_contractors
  SET status = 'removed'
  WHERE job_id = p_job_id AND contractor_id != p_contractor_id AND status != 'declined';

  -- Update job status
  UPDATE jobs
  SET status = 'assigned'
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_job_contractors_job ON job_contractors(job_id);
CREATE INDEX IF NOT EXISTS idx_job_contractors_contractor ON job_contractors(contractor_id);
CREATE INDEX IF NOT EXISTS idx_job_contractors_status ON job_contractors(status);
CREATE INDEX IF NOT EXISTS idx_jobs_trade_type ON jobs(trade_type);
CREATE INDEX IF NOT EXISTS idx_reschedule_contractor ON reschedule_requests(contractor_id);
