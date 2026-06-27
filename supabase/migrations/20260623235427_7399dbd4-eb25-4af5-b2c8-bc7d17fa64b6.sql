
-- 1. payment_settings: restrict reads to staff (owner/admin) only
DROP POLICY IF EXISTS payment_settings_read_auth ON public.payment_settings;
CREATE POLICY payment_settings_read_staff ON public.payment_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- 2. payment-assets storage bucket: restrict direct reads to staff only.
-- Regular users access the QRIS image via short-lived signed URLs generated
-- server-side by the service role, which do not require this policy.
DROP POLICY IF EXISTS asset_auth_read ON storage.objects;
CREATE POLICY payment_assets_staff_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-assets'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  );

-- 3. Revoke EXECUTE on SECURITY DEFINER functions that are only meant to be
-- invoked by triggers or the service role — not by signed-in users via RPC.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_ticket_reply() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_ticket_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_payment_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_welcome_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.plan_type_from_price(text) FROM PUBLIC, anon, authenticated;
