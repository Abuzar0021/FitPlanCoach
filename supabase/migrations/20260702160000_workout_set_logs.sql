-- Real workout tracking: per-set weight/reps, not just a session summary.
-- Personal records are computed on read (MAX weight_kg per exercise per
-- user) rather than cached, so they're always correct with no trigger to
-- maintain.
--
-- This table postdates the RESET block at the top of full_schema.sql. It
-- uses CREATE TABLE IF NOT EXISTS (not DROP + CREATE) so that re-pasting
-- the accumulated full_schema.sql for a later round never wipes rows a
-- user has already logged here — only a fresh project gets the table
-- created; an existing one is left untouched.
CREATE TABLE IF NOT EXISTS public.workout_set_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  set_number int NOT NULL,
  reps int,
  weight_kg numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workout_set_logs_user_exercise_idx
  ON public.workout_set_logs (user_id, exercise_name, created_at DESC);
CREATE INDEX IF NOT EXISTS workout_set_logs_session_idx ON public.workout_set_logs (session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_set_logs TO authenticated;
GRANT ALL ON public.workout_set_logs TO service_role;
ALTER TABLE public.workout_set_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own set logs" ON public.workout_set_logs;
CREATE POLICY "own set logs" ON public.workout_set_logs FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (user_id = auth.uid());

-- A completion percentage needs to know how many sets the session's plan
-- called for, alongside what was actually logged.
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS planned_sets int;
