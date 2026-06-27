
CREATE OR REPLACE FUNCTION public.plan_type_from_price(_price_id TEXT)
RETURNS subscription_plan
LANGUAGE SQL
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _price_id = 'pro_monthly' THEN 'pro'::subscription_plan
    WHEN _price_id = 'premium_monthly' THEN 'premium'::subscription_plan
    WHEN _price_id = 'elite_monthly' THEN 'elite'::subscription_plan
    ELSE 'free'::subscription_plan
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_active_subscription(UUID, TEXT) FROM authenticated;
