-- Stripe Connect fields for contractors (customer-to-contractor payments)
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS stripe_account_id       TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_status   TEXT NOT NULL DEFAULT 'not_connected',
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT;

-- Stripe tracking fields for individual payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS prolink_fee_amount        NUMERIC(10, 2);
