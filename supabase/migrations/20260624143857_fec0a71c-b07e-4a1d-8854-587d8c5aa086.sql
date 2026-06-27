-- Add owner-only read policy on webhook_events to clear "RLS enabled no policy" lint.
-- Writes are restricted to service_role (no policy needed; writes happen via supabaseAdmin).
CREATE POLICY "Owners can read webhook events" ON public.webhook_events
  FOR SELECT TO authenticated USING (public.is_owner(auth.uid()));