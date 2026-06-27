
-- Owner/Admin write access to payment-assets bucket
DROP POLICY IF EXISTS "payment_assets_insert_staff" ON storage.objects;
CREATE POLICY "payment_assets_insert_staff" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-assets'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  );

DROP POLICY IF EXISTS "payment_assets_update_staff" ON storage.objects;
CREATE POLICY "payment_assets_update_staff" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'payment-assets'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  )
  WITH CHECK (
    bucket_id = 'payment-assets'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  );

DROP POLICY IF EXISTS "payment_assets_delete_staff" ON storage.objects;
CREATE POLICY "payment_assets_delete_staff" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'payment-assets'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  );
