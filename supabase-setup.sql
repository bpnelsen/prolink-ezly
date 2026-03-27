-- Prolink + EZLY Unified Auth Setup
-- Run this in Supabase SQL Editor

-- 1. Add role to profiles (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'contractor';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trade TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create contractor_users table (links auth.users to contractors)
CREATE TABLE IF NOT EXISTS contractor_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contractor_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Seed some test contractors
INSERT INTO contractors (name, trade, phone, email, rating, review_count, status, on_time_rate)
VALUES 
  ('AAA Electric', 'Electrician', '(801) 555-0101', 'aaa@ezly.com', 4.8, 120, 'active', 98),
  ('Reliable Plumbing', 'Plumber', '(801) 555-0102', 'reliable@ezly.com', 4.2, 45, 'available', 92),
  ('Precision Roofing', 'Roofer', '(801) 555-0103', 'precision@ezly.com', 4.9, 88, 'on_break', 85),
  ('Quick Fix HVAC', 'HVAC', '(801) 555-0104', 'quickfix@ezly.com', 4.6, 60, 'available', 90)
ON CONFLICT DO NOTHING;

-- 4. Enable RLS (optional - can enable later)
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contractor_users ENABLE ROW LEVEL SECURITY;