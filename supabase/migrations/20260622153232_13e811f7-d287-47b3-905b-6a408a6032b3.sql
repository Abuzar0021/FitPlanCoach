
-- Expand status enum to cover Stripe lifecycle states
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'trialing';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'past_due';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'incomplete';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'incomplete_expired';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'unpaid';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'paused';
