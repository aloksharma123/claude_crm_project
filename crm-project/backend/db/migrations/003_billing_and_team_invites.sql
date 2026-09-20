-- Adds per-seat annual billing (Razorpay) and team invite support.
-- Run once against the existing database.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_seats INTEGER NOT NULL DEFAULT 1;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS billing_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT,
  seats INTEGER NOT NULL,
  amount_paise BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created', -- created, paid, failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lets a user exist without a password until they accept their invite.
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_accepted BOOLEAN NOT NULL DEFAULT true;
-- Existing rows (all self-signed-up) default to true above; new invited rows set this false.

CREATE INDEX IF NOT EXISTS idx_billing_orders_org ON billing_orders(organization_id);
