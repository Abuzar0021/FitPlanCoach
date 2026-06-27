
-- 1. Extend payment method enum
ALTER TYPE public.payment_method_kind ADD VALUE IF NOT EXISTS 'bank_transfer';
ALTER TYPE public.payment_method_kind ADD VALUE IF NOT EXISTS 'lemon_squeezy';

-- 2. Extend payment_settings
ALTER TABLE public.payment_settings
  ADD COLUMN IF NOT EXISTS ls_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ls_store_id text,
  ADD COLUMN IF NOT EXISTS ls_monthly_variant_id text,
  ADD COLUMN IF NOT EXISTS ls_annual_variant_id text,
  ADD COLUMN IF NOT EXISTS ls_monthly_checkout_url text,
  ADD COLUMN IF NOT EXISTS ls_annual_checkout_url text,
  ADD COLUMN IF NOT EXISTS bank_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_holder text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_va_number text,
  ADD COLUMN IF NOT EXISTS bank_instructions text;

-- Seed the store id so it's visible in Owner Settings even before LS is fully connected
UPDATE public.payment_settings SET ls_store_id = '414930' WHERE singleton = true AND ls_store_id IS NULL;

-- 3. Extend subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS lemonsqueezy_subscription_id text,
  ADD COLUMN IF NOT EXISTS lemonsqueezy_customer_id text,
  ADD COLUMN IF NOT EXISTS lemonsqueezy_order_id text,
  ADD COLUMN IF NOT EXISTS renews_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_ls_sub_id_key
  ON public.subscriptions (lemonsqueezy_subscription_id)
  WHERE lemonsqueezy_subscription_id IS NOT NULL;

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_payment_method_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_payment_method_check
  CHECK (payment_method IS NULL OR payment_method = ANY (ARRAY['qris','paypal','manual','none','bank_transfer','lemon_squeezy']));

-- 4. webhook_events table (idempotency + audit)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_name text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received',
  error_message text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (provider, event_id)
);

GRANT ALL ON public.webhook_events TO service_role;
-- intentionally NO grants to anon or authenticated

CREATE INDEX IF NOT EXISTS webhook_events_provider_received_idx
  ON public.webhook_events (provider, received_at DESC);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies: only service role can access.
