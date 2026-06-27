
-- 1. Remove user-writable subscription policies (privilege escalation fix)
DROP POLICY IF EXISTS "admin sub insert" ON public.subscriptions;
DROP POLICY IF EXISTS "own sub upd self count" ON public.subscriptions;

-- 2. Revoke EXECUTE on claim_first_admin from authenticated; only service_role may call it
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon, authenticated;

-- 3. Set fixed search_path on the pgmq helper SECURITY DEFINER functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
