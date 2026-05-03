-- ============================================================
-- Prolink Seed Data (development only)
-- NOTE: Run schema.sql first. Replace UUIDs as needed.
-- ============================================================

-- Insert a test admin profile (assumes auth user already exists in auth.users)
-- The actual auth.users entry must be created via Supabase Auth admin API or dashboard.

-- Example contractor seed (replace <AUTH_USER_UUID> with real UUID from auth.users):
/*
INSERT INTO profiles (id, email, full_name, phone, role) VALUES
  ('<AUTH_USER_UUID>', 'demo@prolink.dev', 'Demo Contractor', '555-0100', 'contractor');

INSERT INTO contractors (profile_id, business_name, business_type, status, verified) VALUES
  ('<AUTH_USER_UUID>', 'Demo Plumbing LLC', 'llc', 'active', TRUE)
RETURNING id;

-- Replace <CONTRACTOR_UUID> with the id returned above

INSERT INTO contractor_trades (contractor_id, trade, years_experience, is_primary) VALUES
  ('<CONTRACTOR_UUID>', 'Plumbing', 10, TRUE),
  ('<CONTRACTOR_UUID>', 'HVAC', 5, FALSE);

INSERT INTO contractor_service_areas (contractor_id, state_code, zip_code) VALUES
  ('<CONTRACTOR_UUID>', 'TX', '78701'),
  ('<CONTRACTOR_UUID>', 'TX', '78702');

INSERT INTO contractor_licenses (contractor_id, state_code, license_type, license_number, status) VALUES
  ('<CONTRACTOR_UUID>', 'TX', 'Master Plumber', 'TX-MP-00123', 'active');

INSERT INTO clients (contractor_id, first_name, last_name, email, phone, city, state_code, zip_code) VALUES
  ('<CONTRACTOR_UUID>', 'Jane', 'Smith', 'jane@example.com', '555-0200', 'Austin', 'TX', '78701'),
  ('<CONTRACTOR_UUID>', 'Bob', 'Johnson', 'bob@example.com', '555-0201', 'Austin', 'TX', '78702');

INSERT INTO leads (contractor_id, first_name, last_name, email, phone, trade_needed, status, priority) VALUES
  ('<CONTRACTOR_UUID>', 'Alice', 'Brown', 'alice@example.com', '555-0300', 'Plumbing', 'new', 'high'),
  ('<CONTRACTOR_UUID>', 'Charlie', 'Davis', 'charlie@example.com', '555-0301', 'HVAC', 'contacted', 'medium');
*/
