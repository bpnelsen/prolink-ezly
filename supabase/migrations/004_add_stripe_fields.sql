-- Add Stripe-related columns to the profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_status TEXT DEFAULT 'pending';

-- Optional: Create a separate table for cleaner billing-related tracking in the future
CREATE TABLE IF NOT EXISTS contractor_billing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_account_id TEXT,
  onboarding_status TEXT DEFAULT 'pending',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS: Only the contractor can see their own billing record
ALTER TABLE contractor_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can view their own billing" ON contractor_billing
  FOR SELECT USING (auth.uid() = contractor_id);

CREATE POLICY "Contractors can update their own billing" ON contractor_billing
  FOR UPDATE USING (auth.uid() = contractor_id);
