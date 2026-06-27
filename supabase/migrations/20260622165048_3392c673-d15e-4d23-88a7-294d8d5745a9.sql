
-- Replace Stripe-specific columns with Paddle equivalents on subscriptions
ALTER TABLE public.subscriptions
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text;

-- Ensure paddle_subscription_id has a unique constraint (for upsert onConflict)
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_paddle_subscription_id_key
  ON public.subscriptions(paddle_subscription_id)
  WHERE paddle_subscription_id IS NOT NULL;

-- Update provider default tag
UPDATE public.subscriptions SET provider = 'paddle' WHERE provider = 'stripe' OR provider IS NULL;
