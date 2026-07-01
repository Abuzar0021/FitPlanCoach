-- Water intake tracking for the dashboard's daily hydration widget.
-- This table postdates the RESET block at the top of full_schema.sql, so
-- drop it explicitly here to keep this migration safely re-runnable on its
-- own (matching every other migration's paste-and-run guarantee).
DROP TABLE IF EXISTS public.water_logs CASCADE;

CREATE TABLE public.water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_date date NOT NULL,
  amount_ml int NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX water_logs_user_date_idx ON public.water_logs (user_id, logged_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_logs TO authenticated;
GRANT ALL ON public.water_logs TO service_role;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own water logs" ON public.water_logs FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (user_id = auth.uid());
