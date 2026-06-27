
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS price_id TEXT,
  ADD COLUMN IF NOT EXISTS product_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'sandbox';

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_cust ON public.subscriptions(stripe_customer_id);

DROP POLICY IF EXISTS "service role manage subs" ON public.subscriptions;
CREATE POLICY "service role manage subs" ON public.subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON public.subscriptions TO service_role;

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id UUID, _env TEXT DEFAULT 'sandbox')
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND environment = _env
      AND plan_type <> 'free'
      AND (
        (status::text IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status::text IN ('canceled','cancelled') AND current_period_end IS NOT NULL AND current_period_end > now())
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_active_subscription(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(UUID, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.plan_type_from_price(_price_id TEXT)
RETURNS subscription_plan
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _price_id = 'pro_monthly' THEN 'pro'::subscription_plan
    WHEN _price_id = 'premium_monthly' THEN 'premium'::subscription_plan
    WHEN _price_id = 'elite_monthly' THEN 'elite'::subscription_plan
    ELSE 'free'::subscription_plan
  END;
$$;
