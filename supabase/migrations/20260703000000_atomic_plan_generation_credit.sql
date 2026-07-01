-- Atomic, race-free consumption of a plan-generation credit.
--
-- generateFitnessPlan previously read subscriptions.plan_count_used once at
-- the top of the request, checked it against the free limit in application
-- code, did all the (slow) plan-generation work, and only then wrote
-- `freeUsed + 1` back — using the *stale* value it read at the start. Two
-- concurrent requests (a double-click, two open tabs, a retried request)
-- could both read the same starting count, both pass the limit check, and
-- both write back the same incremented value, so a free user could get more
-- generations than their limit allows. Doing the check-and-increment as a
-- single conditional UPDATE closes that race: only one concurrent request
-- can ever win the `plan_count_used < p_free_limit` condition.
--
-- SECURITY DEFINER, but EXECUTE is restricted to service_role only (see
-- 20260623145311_...sql, which already removed the client-writable
-- subscriptions policies) — this must only ever be called from trusted
-- server code (plan-generation.functions.ts via supabaseAdmin), never
-- directly from an authenticated user's browser session.
CREATE OR REPLACE FUNCTION public.consume_plan_generation_credit(
  p_user_id UUID,
  p_unlimited BOOLEAN,
  p_free_limit INT
)
RETURNS TABLE(allowed BOOLEAN, plan_count_used INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  IF p_unlimited THEN
    UPDATE public.subscriptions
      SET plan_count_used = plan_count_used + 1
      WHERE user_id = p_user_id
      RETURNING subscriptions.plan_count_used INTO v_count;
    RETURN QUERY SELECT TRUE, COALESCE(v_count, 0);
    RETURN;
  END IF;

  UPDATE public.subscriptions
    SET plan_count_used = plan_count_used + 1
    WHERE user_id = p_user_id AND plan_count_used < p_free_limit
    RETURNING subscriptions.plan_count_used INTO v_count;

  IF v_count IS NULL THEN
    SELECT s.plan_count_used INTO v_count FROM public.subscriptions s WHERE s.user_id = p_user_id;
    RETURN QUERY SELECT FALSE, COALESCE(v_count, 0);
  ELSE
    RETURN QUERY SELECT TRUE, v_count;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_plan_generation_credit(UUID, BOOLEAN, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_plan_generation_credit(UUID, BOOLEAN, INT) TO service_role;

-- Give a credit back if generation is aborted after the credit was consumed
-- for a reason that isn't the user's fault (e.g. an admin hasn't populated
-- the food/workout catalog yet) — floors at 0, never goes negative.
CREATE OR REPLACE FUNCTION public.refund_plan_generation_credit(p_user_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.subscriptions
    SET plan_count_used = GREATEST(0, plan_count_used - 1)
    WHERE user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.refund_plan_generation_credit(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_plan_generation_credit(UUID) TO service_role;
