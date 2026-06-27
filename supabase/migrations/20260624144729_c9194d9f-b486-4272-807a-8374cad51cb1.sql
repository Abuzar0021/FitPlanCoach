CREATE POLICY "payment_proofs_staff_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
);

CREATE POLICY "payment_proofs_staff_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
);