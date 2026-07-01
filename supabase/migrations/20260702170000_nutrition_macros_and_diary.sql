-- Real macro tracking (carbs/fat, not just calories/protein) plus a full
-- food logging diary so users can log what they actually ate, not just
-- follow the generated plan.
ALTER TABLE public.foods
  ADD COLUMN IF NOT EXISTS carbs_per_100g NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fat_per_100g NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fiber_per_100g NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS carbs_target NUMERIC,
  ADD COLUMN IF NOT EXISTS fat_target NUMERIC;

-- These tables postdate the RESET block at the top of full_schema.sql, so
-- drop them explicitly here to keep this migration safely re-runnable on
-- its own (matching every other migration's paste-and-run guarantee).
DROP TABLE IF EXISTS public.food_log_entries CASCADE;
DROP TABLE IF EXISTS public.food_favorites CASCADE;

CREATE TABLE public.food_log_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_date date NOT NULL,
  meal_category public.meal_category NOT NULL,
  food_id uuid REFERENCES public.foods(id) ON DELETE SET NULL,
  name text NOT NULL,
  grams numeric NOT NULL,
  calories numeric NOT NULL,
  protein numeric NOT NULL,
  carbs numeric NOT NULL,
  fat numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX food_log_entries_user_date_idx
  ON public.food_log_entries (user_id, logged_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_log_entries TO authenticated;
GRANT ALL ON public.food_log_entries TO service_role;
ALTER TABLE public.food_log_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own food log entries" ON public.food_log_entries FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (user_id = auth.uid());

CREATE TABLE public.food_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, food_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_favorites TO authenticated;
GRANT ALL ON public.food_favorites TO service_role;
ALTER TABLE public.food_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own food favorites" ON public.food_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (user_id = auth.uid());
