
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS streak_current int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_longest int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_workout_date date;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('payment','subscription','account','achievement','goal','system')),
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own notifications delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.achievements (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'trophy',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO authenticated, anon;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements public read" ON public.achievements FOR SELECT TO authenticated, anon USING (true);

INSERT INTO public.achievements (id,title,description,icon,sort_order) VALUES
  ('first_workout','First Workout','Complete your first workout','dumbbell',10),
  ('streak_3','3-Day Streak','Work out 3 days in a row','flame',20),
  ('streak_7','7-Day Streak','Work out 7 days in a row','flame',30),
  ('streak_30','30-Day Streak','Work out 30 days in a row','crown',40),
  ('first_log','First Log','Log your first weight','scale',50),
  ('goal_set','Goal Set','Complete onboarding','target',60),
  ('profile_complete','Profile Complete','Fill out your full profile','user-check',70),
  ('pro_member','Pro Member','Upgrade to Pro','sparkles',80)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);
CREATE INDEX IF NOT EXISTS user_achievements_user_idx ON public.user_achievements(user_id, unlocked_at DESC);
GRANT SELECT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own achievements read" ON public.user_achievements FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  performed_on date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  focus text,
  duration_min int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workout_sessions_user_idx ON public.workout_sessions(user_id, performed_on DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.workout_sessions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_payment_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications(user_id,category,title,body,link)
      VALUES (NEW.user_id,'payment','Payment approved','Your Pro subscription is now active. Welcome to Pro!','/subscription');
      INSERT INTO public.user_achievements(user_id,achievement_id) VALUES (NEW.user_id,'pro_member')
        ON CONFLICT DO NOTHING;
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications(user_id,category,title,body,link)
      VALUES (NEW.user_id,'payment','Payment could not be verified',
              COALESCE(NEW.review_notes,'Please review and resubmit your payment.'),'/subscription');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_payment_status ON public.payment_submissions;
CREATE TRIGGER trg_notify_payment_status
  AFTER UPDATE ON public.payment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_status();
