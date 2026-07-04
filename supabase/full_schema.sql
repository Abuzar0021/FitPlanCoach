-- FitPlanCoach — full database schema (all migrations concatenated in order).
-- Paste this whole file into your Supabase project's SQL Editor and Run.
-- Safe to run more than once (starts with a RESET block that drops its own
-- objects first) — e.g. after clearing tables by hand and needing a clean
-- re-apply. It never touches auth.users, so real accounts are preserved.
--
-- This file is now SELF-CONTAINED: it ends with the starter catalog seed
-- (foods / workout_templates / exercises). The RESET block drops those three
-- tables, so the seed at the bottom re-populates them in the SAME paste —
-- you do NOT need to run supabase/seed.sql separately. Without the catalog,
-- AI plan generation has nothing to build from and fails with "No foods are
-- configured yet". (supabase/seed.sql is kept as a standalone copy for
-- re-seeding the catalog on its own.)

-- =====================================================================
-- RESET (safe to re-run): drops everything this script creates first,
-- so pasting this whole file always works even on a partially-deleted
-- or already-populated project. Your auth.users (actual accounts) are
-- NEVER touched — only the public schema objects listed below.
-- =====================================================================
drop function if exists
  public.claim_first_admin,
  public.delete_email,
  public.enqueue_email,
  public.handle_new_user,
  public.has_active_subscription,
  public.has_role,
  public.is_owner,
  public.move_to_dlq,
  public.notify_payment_status,
  public.notify_ticket_reply,
  public.notify_ticket_status,
  public.plan_type_from_price,
  public.read_email_batch,
  public.send_welcome_email,
  public.sync_feature_vote_count,
  public.transfer_ownership,
  public.update_updated_at_column
  cascade;

-- Only the three catalog tables (foods / exercises / workout_templates) are
-- ever dropped here. Every other table listed below used to be dropped on
-- every re-paste too — which meant every real user's profile, subscription,
-- workout/meal plans, progress history, support tickets, and blog posts
-- were silently deleted each time this file was re-run against a live
-- project, e.g. to apply a later migration bundled into the same paste.
-- auth.users itself was never touched, so accounts could still log in, but
-- everything else about them was gone. Fixed by dropping only the catalog
-- (which the seed at the bottom of this file fully repopulates anyway) and
-- switching every other CREATE TABLE/TYPE below to IF NOT EXISTS /
-- duplicate_object-guarded, so a second paste is genuinely a no-op for
-- anything that already exists instead of destroying it.
drop table if exists
  public.exercises,
  public.foods,
  public.workout_templates
  cascade;

-- difficulty_level is used only by the two catalog tables above, which are
-- fully reseeded every paste anyway, so it's safe to drop and recreate too.
drop type if exists
  public.difficulty_level
  cascade;

-- =====================================================================
-- 20260622150818_dadbdba9-a9c8-4a38-8258-a709110c2c3a.sql
-- =====================================================================

-- Enums. Guarded (not dropped above), since these belong to tables that
-- hold real user data and must survive a re-paste — see the RESET block.
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.fitness_goal AS ENUM ('lose_fat', 'build_muscle', 'maintain');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.activity_level AS ENUM ('sedentary', 'light', 'moderate', 'active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.budget_level AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.gender AS ENUM ('male', 'female', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- difficulty_level is dropped above (catalog-only), so this one stays a
-- plain CREATE — it always runs right after a fresh DROP.
CREATE TYPE public.difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
DO $$ BEGIN
  CREATE TYPE public.meal_category AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro', 'premium', 'elite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'cancelled', 'past_due');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================================
-- profiles
-- =========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  age INT,
  gender public.gender,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  country TEXT,
  activity_level public.activity_level,
  goal public.fitness_goal,
  budget_level public.budget_level,
  onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- user_roles + has_role
-- =========================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- profile policies (needs has_role)
DROP POLICY IF EXISTS "users read own profile" ON public.profiles;
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "users insert own profile" ON public.profiles;
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins delete profile" ON public.profiles;
CREATE POLICY "admins delete profile" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.subscriptions (user_id, plan_type, status)
    VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$;

-- =========================================================
-- foods
-- =========================================================
CREATE TABLE public.foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'global',
  calories_per_100g NUMERIC NOT NULL,
  protein_per_100g NUMERIC NOT NULL,
  category public.meal_category NOT NULL,
  budget_level public.budget_level NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.foods TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.foods TO authenticated;
GRANT ALL ON public.foods TO service_role;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authed read foods" ON public.foods FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write foods" ON public.foods FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update foods" ON public.foods FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete foods" ON public.foods FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_foods_updated BEFORE UPDATE ON public.foods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX foods_country_budget_cat_idx ON public.foods(country, budget_level, category) WHERE enabled;

-- =========================================================
-- exercises + workout templates
-- =========================================================
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  equipment TEXT,
  difficulty public.difficulty_level NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read exercises" ON public.exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin insert exercises" ON public.exercises FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update exercises" ON public.exercises FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete exercises" ON public.exercises FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_ex_updated BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  goal public.fitness_goal NOT NULL,
  level public.difficulty_level NOT NULL,
  -- weekly schedule: [{day:"Mon", focus:"Push", items:[{exercise_id,sets,reps,rest_seconds}]}, ...]
  schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_templates TO authenticated;
GRANT ALL ON public.workout_templates TO service_role;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read wt" ON public.workout_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin ins wt" ON public.workout_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin upd wt" ON public.workout_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin del wt" ON public.workout_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_wt_updated BEFORE UPDATE ON public.workout_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Generated plans
-- =========================================================
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calories_target NUMERIC NOT NULL,
  protein_target NUMERIC NOT NULL,
  meals JSONB NOT NULL, -- {breakfast:[{food_id,grams,calories,protein}],...}
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;
GRANT ALL ON public.meal_plans TO service_role;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own meal plans" ON public.meal_plans;
CREATE POLICY "own meal plans" ON public.meal_plans FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  schedule JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_plans TO authenticated;
GRANT ALL ON public.workout_plans TO service_role;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own workout plans" ON public.workout_plans;
CREATE POLICY "own workout plans" ON public.workout_plans FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid());

-- =========================================================
-- progress
-- =========================================================
CREATE TABLE IF NOT EXISTS public.progress_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg NUMERIC NOT NULL,
  note TEXT,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_entries TO authenticated;
GRANT ALL ON public.progress_entries TO service_role;
ALTER TABLE public.progress_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own progress" ON public.progress_entries;
CREATE POLICY "own progress" ON public.progress_entries FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid());

-- =========================================================
-- subscriptions
-- =========================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type public.subscription_plan NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'active',
  expiry_date TIMESTAMPTZ,
  provider TEXT,
  provider_ref TEXT,
  plan_count_used INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own sub read" ON public.subscriptions;
CREATE POLICY "own sub read" ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "own sub upd self count" ON public.subscriptions;
CREATE POLICY "own sub upd self count" ON public.subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admin sub insert" ON public.subscriptions;
CREATE POLICY "admin sub insert" ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_sub_updated ON public.subscriptions;
CREATE TRIGGER trg_sub_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- new-user trigger (after subscriptions exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- app_settings (singleton key-value)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read settings" ON public.app_settings;
CREATE POLICY "read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin write settings" ON public.app_settings;
CREATE POLICY "admin write settings" ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admin upd settings" ON public.app_settings;
CREATE POLICY "admin upd settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admin del settings" ON public.app_settings;
CREATE POLICY "admin del settings" ON public.app_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- analytics_events
-- =========================================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.analytics_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.analytics_events_id_seq TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
GRANT SELECT ON public.analytics_events TO authenticated;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "self insert events" ON public.analytics_events;
CREATE POLICY "self insert events" ON public.analytics_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
DROP POLICY IF EXISTS "admin read events" ON public.analytics_events;
CREATE POLICY "admin read events" ON public.analytics_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS analytics_created_idx ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_user_idx ON public.analytics_events(user_id, created_at DESC);


-- =====================================================================
-- 20260622150838_c67cac04-a294-4386-9b93-321ba3ccd919.sql
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- has_role is intentionally callable by authenticated for use in policies; restrict to authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;


-- =====================================================================
-- 20260622151522_374ba181-f26c-400a-9044-43df7023bd5d.sql
-- =====================================================================

CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_exists BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO admin_exists;
  IF admin_exists THEN RETURN FALSE; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN TRUE;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;


-- =====================================================================
-- 20260622153232_13e811f7-d287-47b3-905b-6a408a6032b3.sql
-- =====================================================================

-- Expand status enum to cover Stripe lifecycle states
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'trialing';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'past_due';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'incomplete';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'incomplete_expired';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'unpaid';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'paused';


-- =====================================================================
-- 20260622153315_b65479fe-76b3-4ad7-932a-b528ec8e9f2c.sql
-- =====================================================================
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'canceled';

-- =====================================================================
-- 20260622153337_43502296-47e9-4767-a920-dde402e79571.sql
-- =====================================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS price_id TEXT,
  ADD COLUMN IF NOT EXISTS product_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'sandbox';

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_cust ON public.subscriptions(stripe_customer_id);

DROP POLICY IF EXISTS "service role manage subs" ON public.subscriptions;
CREATE POLICY "service role manage subs" ON public.subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON public.subscriptions TO service_role;

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id UUID, _env TEXT DEFAULT 'sandbox')
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND environment = _env
      AND plan_type <> 'free'
      AND (
        (status::text IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status::text IN ('canceled','cancelled') AND current_period_end IS NOT NULL AND current_period_end > now())
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_active_subscription(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(UUID, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.plan_type_from_price(_price_id TEXT)
RETURNS subscription_plan
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _price_id = 'pro_monthly' THEN 'pro'::subscription_plan
    WHEN _price_id = 'premium_monthly' THEN 'premium'::subscription_plan
    WHEN _price_id = 'elite_monthly' THEN 'elite'::subscription_plan
    ELSE 'free'::subscription_plan
  END;
$$;


-- =====================================================================
-- 20260622153357_6e9f1335-d234-4ea0-9c08-66a1a062d028.sql
-- =====================================================================

CREATE OR REPLACE FUNCTION public.plan_type_from_price(_price_id TEXT)
RETURNS subscription_plan
LANGUAGE SQL
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _price_id = 'pro_monthly' THEN 'pro'::subscription_plan
    WHEN _price_id = 'premium_monthly' THEN 'premium'::subscription_plan
    WHEN _price_id = 'elite_monthly' THEN 'elite'::subscription_plan
    ELSE 'free'::subscription_plan
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_active_subscription(UUID, TEXT) FROM authenticated;


-- =====================================================================
-- 20260622154608_e3a0fbe6-d0f3-417b-ab22-590c4221eb01.sql
-- =====================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS needs_plan_regeneration boolean NOT NULL DEFAULT false;

-- =====================================================================
-- 20260622165048_3392c673-d15e-4d23-88a7-294d8d5745a9.sql
-- =====================================================================

-- Replace Stripe-specific columns with Paddle equivalents on subscriptions
ALTER TABLE public.subscriptions
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text;

-- Ensure paddle_subscription_id has a unique constraint (for upsert onConflict)
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_paddle_subscription_id_key
  ON public.subscriptions(paddle_subscription_id)
  WHERE paddle_subscription_id IS NOT NULL;

-- Update provider default tag
UPDATE public.subscriptions SET provider = 'paddle' WHERE provider = 'stripe' OR provider IS NULL;


-- =====================================================================
-- 20260623134452_email_infra.sql
-- =====================================================================
-- Email infrastructure
-- Creates the queue system, send log, send state, suppression, and unsubscribe
-- tables used by both auth and transactional emails.

-- Extensions required for queue processing
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create email queues (auth = high priority, transactional = normal)
-- Wrapped in DO blocks to handle "queue already exists" errors idempotently.
DO $$ BEGIN PERFORM pgmq.create('auth_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Dead-letter queues for messages that exceed max retries
DO $$ BEGIN PERFORM pgmq.create('auth_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Email send log table (audit trail for all send attempts)
-- UPDATE is allowed for the service role so the suppression edge function
-- can update a log record's status when a bounce/complaint/unsubscribe occurs.
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supabase no longer grants public-schema access to service_role by default;
-- emit the grant explicitly so edge functions can reach the table via PostgREST.
GRANT ALL ON public.email_send_log TO service_role;

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read send log"
    ON public.email_send_log FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert send log"
    ON public.email_send_log FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can update send log"
    ON public.email_send_log FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);

-- Backfill: add message_id column to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_log ADD COLUMN message_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log(message_id);

-- Prevent duplicate sends: only one 'sent' row per message_id.
-- If VT expires and another worker picks up the same message, the pre-send
-- check catches it. This index is a DB-level safety net for race conditions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique
  ON public.email_send_log(message_id) WHERE status = 'sent';

-- Backfill: update status CHECK constraint for existing tables that predate new statuses
DO $$ BEGIN
  ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check;
  ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check
    CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq'));
END $$;

-- Rate-limit state and queue config (single row, tracks Retry-After cooldown + throughput settings)
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until TIMESTAMPTZ,
  batch_size INTEGER NOT NULL DEFAULT 10,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Backfill: add config columns to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN batch_size INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN send_delay_ms INTEGER NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

GRANT ALL ON public.email_send_state TO service_role;

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage send state"
    ON public.email_send_state FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RPC wrappers so Edge Functions can interact with pgmq via supabase.rpc()
-- (PostgREST only exposes functions in the public schema; pgmq functions are in the pgmq schema)
-- All wrappers auto-create the queue on undefined_table (42P01) so emails
-- are never lost if the queue was dropped (extension upgrade, restore, etc.).
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name TEXT, batch_size INT, vt INT)
RETURNS TABLE(msg_id BIGINT, read_ct INT, message JSONB)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name TEXT, message_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue TEXT, dlq_name TEXT, message_id BIGINT, payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;

-- Restrict queue RPC wrappers to service_role only (SECURITY DEFINER runs as owner,
-- so without this any authenticated user could manipulate the email queues)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) TO service_role;

-- Suppressed emails table (tracks unsubscribes, bounces, complaints)
-- Append-only: no DELETE or UPDATE policies to prevent bypassing suppression.
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

GRANT ALL ON public.suppressed_emails TO service_role;

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read suppressed emails"
    ON public.suppressed_emails FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert suppressed emails"
    ON public.suppressed_emails FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email);

-- Email unsubscribe tokens table (one token per email address for unsubscribe links)
-- No DELETE policy to prevent removing tokens. UPDATE allowed only to mark tokens as used.
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

GRANT ALL ON public.email_unsubscribe_tokens TO service_role;

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read tokens"
    ON public.email_unsubscribe_tokens FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert tokens"
    ON public.email_unsubscribe_tokens FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can mark tokens as used"
    ON public.email_unsubscribe_tokens FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);

-- ============================================================
-- POST-MIGRATION STEPS (applied dynamically by setup_email_infra)
-- These steps contain project-specific secrets and URLs and
-- cannot be expressed as static SQL. They are applied via the
-- Supabase Management API (ExecuteSQL) each time the tool runs.
-- ============================================================
--
-- 1. VAULT SECRET
--    Stores (or updates) the Supabase service_role key in
--    vault as 'email_queue_service_role_key'.
--    Uses vault.create_secret / vault.update_secret (upsert).
--    To revert: DELETE FROM vault.secrets WHERE name = 'email_queue_service_role_key';
--
-- 2. CRON JOB (pg_cron)
--    Creates job 'process-email-queue' with a 5-second interval.
--    The job checks:
--      a) rate-limit cooldown (email_send_state.retry_after_until)
--      b) whether auth_emails or transactional_emails queues have messages
--    If conditions are met, it calls the process-email-queue Edge Function
--    via net.http_post using the vault-stored service_role key.
--    To revert: SELECT cron.unschedule('process-email-queue');


-- =====================================================================
-- 20260623135225_ca6ee0e6-e225-4d19-a97f-e00a1f631586.sql
-- =====================================================================
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- =====================================================================
-- 20260623145311_0283ae64-1197-4ffa-946a-9bd58c49b683.sql
-- =====================================================================

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


-- =====================================================================
-- 20260623231136_09665874-a4fb-4ae3-ade2-e546f4b6e4bf.sql
-- =====================================================================
-- 1. Extend role enum with 'owner'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'owner' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'owner';
  END IF;
END $$;


-- =====================================================================
-- 20260623231217_04a2ab12-cf4e-4b54-9161-7cac20a1f571.sql
-- =====================================================================

-- 2. Promote designated owner
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'owner'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'abuzarelahi01@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Drop the unsafe public claim function
DROP FUNCTION IF EXISTS public.claim_first_admin();

-- 4. is_owner helper
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'owner')
$$;
REVOKE ALL ON FUNCTION public.is_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated, service_role;

-- Lock down has_role too (defense in depth)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 5. Tighten user_roles RLS
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_self" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_owner_all" ON public.user_roles;

CREATE POLICY "user_roles_select_self"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Only owners can change role rows, and they cannot target themselves
-- (prevents an owner from accidentally locking themselves out, and blocks self-escalation).
DROP POLICY IF EXISTS "user_roles_owner_insert" ON public.user_roles;
CREATE POLICY "user_roles_owner_insert"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_owner(auth.uid()) AND user_id <> auth.uid());

DROP POLICY IF EXISTS "user_roles_owner_update" ON public.user_roles;
CREATE POLICY "user_roles_owner_update"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.is_owner(auth.uid()) AND user_id <> auth.uid())
WITH CHECK (public.is_owner(auth.uid()) AND user_id <> auth.uid());

DROP POLICY IF EXISTS "user_roles_owner_delete" ON public.user_roles;
CREATE POLICY "user_roles_owner_delete"
ON public.user_roles FOR DELETE TO authenticated
USING (public.is_owner(auth.uid()) AND user_id <> auth.uid());

-- 6. Secure ownership-transfer function (owner only, atomic swap)
CREATE OR REPLACE FUNCTION public.transfer_ownership(_new_owner uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_owner(caller) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _new_owner IS NULL OR _new_owner = caller THEN RAISE EXCEPTION 'Invalid target'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _new_owner AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Target account must be a verified user';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_new_owner, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
  DELETE FROM public.user_roles WHERE user_id = caller AND role = 'owner';
  INSERT INTO public.user_roles (user_id, role) VALUES (caller, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.transfer_ownership(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_ownership(uuid) TO authenticated;


-- =====================================================================
-- 20260623232102_51118073-7685-4cb7-a24c-b2b06c4549a8.sql
-- =====================================================================

-- ============================================================
-- Subscriptions: add billing interval + method
-- ============================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_interval text CHECK (billing_interval IN ('monthly','annual')),
  ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('qris','paypal','manual','none'));

-- ============================================================
-- payment_settings (single-row, owner-managed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  monthly_price_cents integer NOT NULL DEFAULT 500,
  annual_price_cents integer NOT NULL DEFAULT 4800,
  currency text NOT NULL DEFAULT 'usd',
  qris_image_path text,
  paypal_email text,
  payment_instructions text,
  qris_instructions text,
  paypal_instructions text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_settings_singleton_unique UNIQUE (singleton)
);

GRANT SELECT ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_settings_read_auth" ON public.payment_settings;
CREATE POLICY "payment_settings_read_auth"
ON public.payment_settings FOR SELECT TO authenticated USING (true);
-- writes locked to service role / server functions

DROP TRIGGER IF EXISTS trg_payment_settings_updated ON public.payment_settings;
CREATE TRIGGER trg_payment_settings_updated
BEFORE UPDATE ON public.payment_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.payment_settings (singleton) VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

-- ============================================================
-- payment_submissions
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.payment_submission_status AS ENUM ('pending','approved','rejected','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method_kind AS ENUM ('qris','paypal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_interval_kind AS ENUM ('monthly','annual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'pro',
  billing_interval public.billing_interval_kind NOT NULL,
  method public.payment_method_kind NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  transaction_ref text,
  payer_email text,
  paypal_transaction_id text,
  proof_path text,
  user_notes text,
  status public.payment_submission_status NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_submissions_user_idx ON public.payment_submissions(user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS payment_submissions_status_idx ON public.payment_submissions(status, submitted_at DESC);

GRANT SELECT, INSERT ON public.payment_submissions TO authenticated;
GRANT ALL ON public.payment_submissions TO service_role;
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;

-- Users see their own submissions; admins/owners see all
DROP POLICY IF EXISTS "ps_select_own_or_staff" ON public.payment_submissions;
CREATE POLICY "ps_select_own_or_staff"
ON public.payment_submissions FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_owner(auth.uid())
);

-- Users can create their own submissions only, always in 'pending' status
DROP POLICY IF EXISTS "ps_insert_own_pending" ON public.payment_submissions;
CREATE POLICY "ps_insert_own_pending"
ON public.payment_submissions FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status = 'pending'
  AND reviewed_at IS NULL
  AND reviewed_by IS NULL
  AND review_notes IS NULL
);

-- No client UPDATE/DELETE — only service role (server functions) can change status

DROP TRIGGER IF EXISTS trg_payment_submissions_updated ON public.payment_submissions;
CREATE TRIGGER trg_payment_submissions_updated
BEFORE UPDATE ON public.payment_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- payment_approvals (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.payment_submissions(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('approve','reject')),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  actor_role text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_approvals_submission_idx ON public.payment_approvals(submission_id, created_at DESC);

GRANT SELECT ON public.payment_approvals TO authenticated;
GRANT ALL ON public.payment_approvals TO service_role;
ALTER TABLE public.payment_approvals ENABLE ROW LEVEL SECURITY;

-- Read: the submitting user (their own audit), admins, owner
DROP POLICY IF EXISTS "pa_select_own_or_staff" ON public.payment_approvals;
CREATE POLICY "pa_select_own_or_staff"
ON public.payment_approvals FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_owner(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.payment_submissions ps
    WHERE ps.id = payment_approvals.submission_id AND ps.user_id = auth.uid()
  )
);
-- writes locked to service role

-- ============================================================
-- billing_history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.billing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id uuid REFERENCES public.payment_submissions(id) ON DELETE SET NULL,
  plan text NOT NULL,
  billing_interval public.billing_interval_kind NOT NULL,
  method public.payment_method_kind,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_history_user_idx ON public.billing_history(user_id, created_at DESC);

GRANT SELECT ON public.billing_history TO authenticated;
GRANT ALL ON public.billing_history TO service_role;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bh_select_own_or_staff" ON public.billing_history;
CREATE POLICY "bh_select_own_or_staff"
ON public.billing_history FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_owner(auth.uid())
);

-- ============================================================
-- Storage policies
-- ============================================================
-- payment-proofs: users upload to their own folder; staff read all
DROP POLICY IF EXISTS "proof_user_upload" ON storage.objects;
DROP POLICY IF EXISTS "proof_user_read" ON storage.objects;
DROP POLICY IF EXISTS "proof_staff_read" ON storage.objects;

CREATE POLICY "proof_user_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "proof_user_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND ((storage.foldername(name))[1] = auth.uid()::text
       OR public.has_role(auth.uid(), 'admin')
       OR public.is_owner(auth.uid()))
);

-- payment-assets (QRIS image, etc.): authenticated read; only owner can write via server fn
-- (Writes happen through service role; client policies just need read.)
DROP POLICY IF EXISTS "asset_auth_read" ON storage.objects;
CREATE POLICY "asset_auth_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-assets');


-- =====================================================================
-- 20260623233023_ab2b405c-e866-453c-b746-867ac18efa25.sql
-- =====================================================================

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
DROP POLICY IF EXISTS "own notifications read" ON public.notifications;
CREATE POLICY "own notifications read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own notifications update" ON public.notifications;
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "own notifications delete" ON public.notifications;
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
DROP POLICY IF EXISTS "achievements public read" ON public.achievements;
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
DROP POLICY IF EXISTS "own achievements read" ON public.user_achievements;
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
DROP POLICY IF EXISTS "own sessions" ON public.workout_sessions;
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


-- =====================================================================
-- 20260623233041_1c1cebca-cc45-4268-b1e8-b3abecf085ba.sql
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.notify_payment_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;


-- =====================================================================
-- 20260623233727_b38ede75-b824-46ed-ba71-d3bd7a424274.sql
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('open','in_progress','waiting_user','resolved','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL CHECK (category IN ('account','billing','payment','technical','feedback','other')),
  status public.ticket_status NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON public.support_tickets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets(status, last_activity_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own tickets select" ON public.support_tickets;
CREATE POLICY "own tickets select" ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));
DROP POLICY IF EXISTS "own tickets insert" ON public.support_tickets;
CREATE POLICY "own tickets insert" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "staff tickets update" ON public.support_tickets;
CREATE POLICY "staff tickets update" ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_role text NOT NULL CHECK (author_role IN ('user','staff')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_idx ON public.support_ticket_messages(ticket_id, created_at);
GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket messages select" ON public.support_ticket_messages;
CREATE POLICY "ticket messages select" ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND (
        t.user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')
      ))
  );
DROP POLICY IF EXISTS "ticket messages insert" ON public.support_ticket_messages;
CREATE POLICY "ticket messages insert" ON public.support_ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND (
        t.user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')
      ))
  );

-- Notify ticket owner on staff reply
CREATE OR REPLACE FUNCTION public.notify_ticket_reply() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner_id uuid;
  subj text;
BEGIN
  SELECT user_id, subject INTO owner_id, subj FROM public.support_tickets WHERE id = NEW.ticket_id;
  UPDATE public.support_tickets SET last_activity_at = now() WHERE id = NEW.ticket_id;
  IF NEW.author_role = 'staff' AND owner_id IS NOT NULL AND NEW.author_id <> owner_id THEN
    INSERT INTO public.notifications(user_id,category,title,body,link)
    VALUES (owner_id,'account','Support replied to your ticket', LEFT(COALESCE(subj,'Your ticket') || ' — ' || NEW.body, 240), '/support');
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_ticket_reply() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_ticket_reply ON public.support_ticket_messages;
CREATE TRIGGER trg_notify_ticket_reply
  AFTER INSERT ON public.support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_reply();

-- Notify ticket owner on status change
CREATE OR REPLACE FUNCTION public.notify_ticket_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications(user_id,category,title,body,link)
    VALUES (NEW.user_id,'account','Ticket status: ' || NEW.status::text, NEW.subject, '/support');
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_ticket_status() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_ticket_status ON public.support_tickets;
CREATE TRIGGER trg_notify_ticket_status
  AFTER UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_status();


-- =====================================================================
-- 20260623234258_4b523e40-2420-47d1-b447-89aea0d55780.sql
-- =====================================================================

CREATE OR REPLACE FUNCTION public.send_welcome_email() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq AS $$
DECLARE
  recipient text;
  display_name text;
BEGIN
  recipient := NEW.email;
  display_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  IF recipient IS NULL THEN RETURN NEW; END IF;
  BEGIN
    PERFORM pgmq.send('transactional_emails', jsonb_build_object(
      'templateName', 'welcome',
      'recipientEmail', lower(recipient),
      'templateData', jsonb_build_object('name', display_name),
      'idempotencyKey', 'welcome-' || NEW.id::text
    ));
  EXCEPTION WHEN OTHERS THEN
    -- Never block signup if email queue isn't available
    NULL;
  END;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.send_welcome_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_send_welcome_email ON auth.users;
CREATE TRIGGER trg_send_welcome_email
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.send_welcome_email();


-- =====================================================================
-- 20260623235427_7399dbd4-eb25-4af5-b2c8-bc7d17fa64b6.sql
-- =====================================================================

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


-- =====================================================================
-- 20260623235448_35ba4939-2e3f-4827-8572-479617dea245.sql
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_owner(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon, authenticated;


-- =====================================================================
-- 20260623235531_18ca3bc5-6f93-468f-a837-08d60bef7d5f.sql
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.transfer_ownership(uuid) FROM PUBLIC, anon, authenticated;


-- =====================================================================
-- 20260624001331_008201c2-03c7-4c4f-be3c-12b201cf47ba.sql
-- =====================================================================
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated;

-- =====================================================================
-- 20260624121550_f8c4b963-cb8f-4667-a839-97a81f199cc9.sql
-- =====================================================================

-- 1. Extend payment method enum
ALTER TYPE public.payment_method_kind ADD VALUE IF NOT EXISTS 'bank_transfer';
ALTER TYPE public.payment_method_kind ADD VALUE IF NOT EXISTS 'lemon_squeezy';

-- 2. Extend payment_settings
ALTER TABLE public.payment_settings
  ADD COLUMN IF NOT EXISTS ls_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ls_store_id text,
  ADD COLUMN IF NOT EXISTS ls_monthly_variant_id text,
  ADD COLUMN IF NOT EXISTS ls_annual_variant_id text,
  ADD COLUMN IF NOT EXISTS ls_monthly_checkout_url text,
  ADD COLUMN IF NOT EXISTS ls_annual_checkout_url text,
  ADD COLUMN IF NOT EXISTS bank_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_holder text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_va_number text,
  ADD COLUMN IF NOT EXISTS bank_instructions text;

-- Seed the store id so it's visible in Owner Settings even before LS is fully connected
UPDATE public.payment_settings SET ls_store_id = '414930' WHERE singleton = true AND ls_store_id IS NULL;

-- 3. Extend subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS lemonsqueezy_subscription_id text,
  ADD COLUMN IF NOT EXISTS lemonsqueezy_customer_id text,
  ADD COLUMN IF NOT EXISTS lemonsqueezy_order_id text,
  ADD COLUMN IF NOT EXISTS renews_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_ls_sub_id_key
  ON public.subscriptions (lemonsqueezy_subscription_id)
  WHERE lemonsqueezy_subscription_id IS NOT NULL;

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_payment_method_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_payment_method_check
  CHECK (payment_method IS NULL OR payment_method = ANY (ARRAY['qris','paypal','manual','none','bank_transfer','lemon_squeezy']));

-- 4. webhook_events table (idempotency + audit)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_name text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received',
  error_message text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (provider, event_id)
);

GRANT ALL ON public.webhook_events TO service_role;
-- intentionally NO grants to anon or authenticated

CREATE INDEX IF NOT EXISTS webhook_events_provider_received_idx
  ON public.webhook_events (provider, received_at DESC);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies: only service role can access.


-- =====================================================================
-- 20260624122137_cb0ba046-b72b-478d-83c4-05a1f4a2a442.sql
-- =====================================================================

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


-- =====================================================================
-- 20260624143857_fec0a71c-b07e-4a1d-8854-587d8c5aa086.sql
-- =====================================================================
-- Add owner-only read policy on webhook_events to clear "RLS enabled no policy" lint.
-- Writes are restricted to service_role (no policy needed; writes happen via supabaseAdmin).
DROP POLICY IF EXISTS "Owners can read webhook events" ON public.webhook_events;
CREATE POLICY "Owners can read webhook events" ON public.webhook_events
  FOR SELECT TO authenticated USING (public.is_owner(auth.uid()));

-- =====================================================================
-- 20260624144729_c9194d9f-b486-4272-807a-8374cad51cb1.sql
-- =====================================================================
DROP POLICY IF EXISTS "payment_proofs_staff_delete" ON storage.objects;
CREATE POLICY "payment_proofs_staff_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
);

DROP POLICY IF EXISTS "payment_proofs_staff_read" ON storage.objects;
CREATE POLICY "payment_proofs_staff_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
);

-- =====================================================================
-- 20260628120000_feature_requests.sql
-- =====================================================================
-- Feature requests / feedback board.
-- Users submit ideas, vote (one per user), and comment. Staff (admin/owner)
-- moderate status. vote_count is kept in sync by a trigger so the board can be
-- ordered by popularity cheaply.

DO $$ BEGIN
  CREATE TYPE public.feature_status AS ENUM ('open', 'planned', 'in_progress', 'completed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.feature_category AS ENUM ('feature', 'improvement', 'bug');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  category public.feature_category NOT NULL DEFAULT 'feature',
  status public.feature_status NOT NULL DEFAULT 'open',
  vote_count integer NOT NULL DEFAULT 0,
  admin_note text CHECK (admin_note IS NULL OR char_length(admin_note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_request_votes (
  feature_request_id uuid NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (feature_request_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.feature_request_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id uuid NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON public.feature_requests (status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_votes ON public.feature_requests (vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_feature_comments_req ON public.feature_request_comments (feature_request_id, created_at);

-- Keep vote_count in sync.
CREATE OR REPLACE FUNCTION public.sync_feature_vote_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feature_requests SET vote_count = vote_count + 1 WHERE id = NEW.feature_request_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feature_requests SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = OLD.feature_request_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_feature_vote_count() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_feature_vote_count ON public.feature_request_votes;
CREATE TRIGGER trg_feature_vote_count
  AFTER INSERT OR DELETE ON public.feature_request_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_feature_vote_count();

DROP TRIGGER IF EXISTS trg_feature_requests_updated ON public.feature_requests;
CREATE TRIGGER trg_feature_requests_updated
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_comments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.feature_requests TO authenticated;
GRANT ALL ON public.feature_requests TO service_role;
DROP POLICY IF EXISTS "fr read all" ON public.feature_requests;
CREATE POLICY "fr read all" ON public.feature_requests
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "fr insert self" ON public.feature_requests;
CREATE POLICY "fr insert self" ON public.feature_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "fr update staff" ON public.feature_requests;
CREATE POLICY "fr update staff" ON public.feature_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "fr delete owner or staff" ON public.feature_requests;
CREATE POLICY "fr delete owner or staff" ON public.feature_requests
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.feature_request_votes TO authenticated;
GRANT ALL ON public.feature_request_votes TO service_role;
DROP POLICY IF EXISTS "frv read all" ON public.feature_request_votes;
CREATE POLICY "frv read all" ON public.feature_request_votes
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "frv insert self" ON public.feature_request_votes;
CREATE POLICY "frv insert self" ON public.feature_request_votes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "frv delete self" ON public.feature_request_votes;
CREATE POLICY "frv delete self" ON public.feature_request_votes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.feature_request_comments TO authenticated;
GRANT ALL ON public.feature_request_comments TO service_role;
DROP POLICY IF EXISTS "frc read all" ON public.feature_request_comments;
CREATE POLICY "frc read all" ON public.feature_request_comments
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "frc insert self" ON public.feature_request_comments;
CREATE POLICY "frc insert self" ON public.feature_request_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "frc delete self or staff" ON public.feature_request_comments;
CREATE POLICY "frc delete self or staff" ON public.feature_request_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));


-- =====================================================================
-- 20260629120000_blog.sql
-- =====================================================================
-- Blog / content system. Staff author posts in the admin; published posts are
-- public. Body is Markdown, rendered safely on the client (see src/lib/markdown).

DO $$ BEGIN
  CREATE TYPE public.blog_status AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
  excerpt text CHECK (excerpt IS NULL OR char_length(excerpt) <= 300),
  body text NOT NULL DEFAULT '',
  cover_image_url text,
  seo_description text CHECK (seo_description IS NULL OR char_length(seo_description) <= 200),
  status public.blog_status NOT NULL DEFAULT 'draft',
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts (status, published_at DESC);

DROP TRIGGER IF EXISTS trg_blog_posts_updated ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_updated
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

-- Anyone may read published posts; staff additionally see drafts.
DROP POLICY IF EXISTS "blog anon read published" ON public.blog_posts;
CREATE POLICY "blog anon read published" ON public.blog_posts
  FOR SELECT TO anon USING (status = 'published');
DROP POLICY IF EXISTS "blog authed read" ON public.blog_posts;
CREATE POLICY "blog authed read" ON public.blog_posts
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_owner(auth.uid())
  );

-- Only staff may write.
DROP POLICY IF EXISTS "blog staff insert" ON public.blog_posts;
CREATE POLICY "blog staff insert" ON public.blog_posts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "blog staff update" ON public.blog_posts;
CREATE POLICY "blog staff update" ON public.blog_posts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "blog staff delete" ON public.blog_posts;
CREATE POLICY "blog staff delete" ON public.blog_posts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));


-- =====================================================================
-- 20260629140000_media_library.sql
-- =====================================================================
-- Media library: a public storage bucket for editorial images, plus a metadata
-- table so the admin can browse, label (alt text), and reuse uploads. Staff
-- write; anyone can read (images are served publicly on the marketing site).

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "media_read" ON storage.objects;
CREATE POLICY "media_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media_insert_staff" ON storage.objects;
CREATE POLICY "media_insert_staff" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  );

DROP POLICY IF EXISTS "media_update_staff" ON storage.objects;
CREATE POLICY "media_update_staff" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'media'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  )
  WITH CHECK (
    bucket_id = 'media'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  );

DROP POLICY IF EXISTS "media_delete_staff" ON storage.objects;
CREATE POLICY "media_delete_staff" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'media'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  );

CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL UNIQUE,
  url text NOT NULL,
  filename text NOT NULL,
  mime_type text,
  size_bytes bigint,
  alt text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_created ON public.media_assets (created_at DESC);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.media_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;

DROP POLICY IF EXISTS "media_assets read" ON public.media_assets;
CREATE POLICY "media_assets read" ON public.media_assets FOR SELECT USING (true);
DROP POLICY IF EXISTS "media_assets staff insert" ON public.media_assets;
CREATE POLICY "media_assets staff insert" ON public.media_assets
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "media_assets staff update" ON public.media_assets;
CREATE POLICY "media_assets staff update" ON public.media_assets
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "media_assets staff delete" ON public.media_assets;
CREATE POLICY "media_assets staff delete" ON public.media_assets
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));



-- =====================================================================
-- 20260701120000_subscriptions_billing_columns.sql
-- =====================================================================

-- The application code (usePlan, the dashboard, the subscription page, and
-- Google Play purchase verification) has always read/written these columns,
-- but the deployed `subscriptions` table never had them — every one of those
-- reads/writes was silently failing (unknown-column errors on select, and
-- rejected updates on purchase), so plan state and premium entitlements never
-- actually reached the UI. Bring the table in line with what the app expects.
alter table public.subscriptions
  add column if not exists billing_interval text,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists renews_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false;

-- =====================================================================
-- 20260702090000_home_workouts_and_levels.sql
-- =====================================================================

-- Home vs gym workouts, owned equipment, and an explicit experience level
-- (previously only inferred from activity_level). Also equipment tagging on
-- workout_templates so home-eligible programs can be identified.
alter table public.profiles
  add column if not exists workout_location text not null default 'gym'
    check (workout_location in ('gym', 'home')),
  add column if not exists available_equipment text[] not null default '{}',
  add column if not exists experience_level text
    check (experience_level in ('beginner', 'intermediate', 'advanced'));

comment on column public.profiles.available_equipment is
  'Subset of: dumbbells, bands. Only meaningful when workout_location = home.';

-- =====================================================================
-- 20260702093000_avatars_bucket.sql
-- =====================================================================

-- Profile picture uploads were failing because the "avatars" bucket only
-- ever existed as a manual dashboard step (easy to miss, and lost on a full
-- database reset) — unlike "media", which is fully SQL-provisioned. Give
-- avatars the same treatment: each user can read any avatar (they're shown
-- publicly across the app) but only write/update/delete their own, enforced
-- by the "<user_id>/..." path prefix the upload code already uses.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- 20260702150000_exercise_instructions.sql
-- =====================================================================

-- Real exercise instructions so users never need to search elsewhere for
-- proper form: step-by-step cues, common mistakes, a breathing pattern, a
-- safety note, and a slot for a demonstration image once generated.
alter table public.exercises
  add column if not exists instructions text[] not null default '{}',
  add column if not exists common_mistakes text[] not null default '{}',
  add column if not exists breathing_tip text,
  add column if not exists safety_tip text,
  add column if not exists image_url text;


-- =========================================================
-- 20260702160000_workout_set_logs.sql
-- =========================================================
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

-- =========================================================
-- 20260702170000_nutrition_macros_and_diary.sql
-- =========================================================
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

-- These tables postdate the RESET block at the top of full_schema.sql. They
-- use CREATE TABLE IF NOT EXISTS (not DROP + CREATE) so that re-pasting the
-- accumulated full_schema.sql for a later round never wipes a user's
-- already-logged food diary entries or favorites.
CREATE TABLE IF NOT EXISTS public.food_log_entries (
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
CREATE INDEX IF NOT EXISTS food_log_entries_user_date_idx
  ON public.food_log_entries (user_id, logged_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_log_entries TO authenticated;
GRANT ALL ON public.food_log_entries TO service_role;
ALTER TABLE public.food_log_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own food log entries" ON public.food_log_entries;
CREATE POLICY "own food log entries" ON public.food_log_entries FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.food_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, food_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_favorites TO authenticated;
GRANT ALL ON public.food_favorites TO service_role;
ALTER TABLE public.food_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own food favorites" ON public.food_favorites;
CREATE POLICY "own food favorites" ON public.food_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (user_id = auth.uid());

-- =========================================================
-- 20260702180000_progress_measurements_and_photos.sql
-- =========================================================
-- Progress tracking beyond weight: body measurements per entry, plus a
-- private progress-photo gallery. All measurement columns are nullable —
-- a user might log just weight most days and full measurements occasionally.
ALTER TABLE public.progress_entries
  ADD COLUMN IF NOT EXISTS body_fat_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS chest_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS waist_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS hips_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS arm_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS thigh_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS neck_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS shoulder_cm NUMERIC;

-- This table postdates the RESET block at the top of full_schema.sql. It
-- uses CREATE TABLE IF NOT EXISTS (not DROP + CREATE) so that re-pasting
-- the accumulated full_schema.sql for a later round never wipes a user's
-- already-uploaded progress photos.
CREATE TABLE IF NOT EXISTS public.progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Storage object path (bucket is private), not a public URL — signed URLs
  -- are generated on read, scoped to the owner by RLS.
  image_path text NOT NULL,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS progress_photos_user_date_idx
  ON public.progress_photos (user_id, recorded_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_photos TO authenticated;
GRANT ALL ON public.progress_photos TO service_role;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own progress photos" ON public.progress_photos;
CREATE POLICY "own progress photos" ON public.progress_photos FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (user_id = auth.uid());

-- Progress photos are sensitive body photos — unlike the public "avatars"
-- bucket, this one stays private. Only the owner can read/write/delete
-- their own files, enforced by the "<user_id>/..." path prefix.
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "progress_photos_read_own" ON storage.objects;
CREATE POLICY "progress_photos_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "progress_photos_insert_own" ON storage.objects;
CREATE POLICY "progress_photos_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "progress_photos_delete_own" ON storage.objects;
CREATE POLICY "progress_photos_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =========================================================
-- 20260702190000_water_logs.sql
-- =========================================================
-- Water intake tracking for the dashboard's daily hydration widget.
-- This table postdates the RESET block at the top of full_schema.sql. It
-- uses CREATE TABLE IF NOT EXISTS (not DROP + CREATE) so that re-pasting
-- the accumulated full_schema.sql for a later round never wipes a user's
-- already-logged water entries.
CREATE TABLE IF NOT EXISTS public.water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_date date NOT NULL,
  amount_ml int NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS water_logs_user_date_idx ON public.water_logs (user_id, logged_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_logs TO authenticated;
GRANT ALL ON public.water_logs TO service_role;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own water logs" ON public.water_logs;
CREATE POLICY "own water logs" ON public.water_logs FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (user_id = auth.uid());

-- =========================================================
-- 20260703000000_atomic_plan_generation_credit.sql
-- =========================================================
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
#variable_conflict use_column
-- RETURNS TABLE(..., plan_count_used INT) implicitly declares
-- `plan_count_used` as a PL/pgSQL variable in this function's scope. Without
-- this pragma, every bare `plan_count_used` reference below (the SET/WHERE
-- clauses) is ambiguous between that variable and the subscriptions column
-- of the same name, and PL/pgSQL's default (`error`) makes the function
-- throw on every single call: "column reference \"plan_count_used\" is
-- ambiguous". `use_column` makes bare references resolve to the table
-- column, which is what every reference here actually means. Confirmed by
-- reproducing the ambiguity error against a real Postgres 16 instance and
-- confirming this pragma resolves it before shipping.
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


-- =========================================================
-- 20260703020000_website_cms.sql
-- =========================================================
-- Website Blog CMS: categories, tags, authors, and richer per-article SEO /
-- scheduling metadata — layered on top of the existing blog_posts table.
--
-- Purely additive: nothing here changes blog_posts.body, its RLS, or the
-- existing simple editor at /admin/blog, which keeps working completely
-- unmodified. The new, fuller-featured editor lives at /cms (a route tree
-- that is entirely separate from /admin — see src/routes/cms.*.tsx) and is
-- gated by the same staff (admin/owner) role that already governs every
-- blog_posts write, so no new permission system was introduced.

-- 1. Extend blog_status with a third state for future-dated posts. Reads
-- treat a 'scheduled' post as live once scheduled_at has passed (see
-- src/lib/blog.functions.ts) — no cron/worker required.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'scheduled' AND enumtypid = 'public.blog_status'::regtype) THEN
    ALTER TYPE public.blog_status ADD VALUE 'scheduled';
  END IF;
END $$;

-- 2. Categories, tags, authors
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description text CHECK (description IS NULL OR char_length(description) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  bio text CHECK (bio IS NULL OR char_length(bio) <= 600),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag ON public.blog_post_tags (tag_id);

-- 3. New per-article columns: category/author references + full SEO fields
-- + scheduling. content_html holds sanitized rich-text output from the new
-- /cms editor; legacy posts (content_html IS NULL) keep rendering from the
-- existing Markdown `body` column exactly as before.
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS author_ref_id uuid REFERENCES public.blog_authors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content_html text,
  ADD COLUMN IF NOT EXISTS seo_title text CHECK (seo_title IS NULL OR char_length(seo_title) <= 70),
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS twitter_card text NOT NULL DEFAULT 'summary_large_image'
    CHECK (twitter_card IN ('summary', 'summary_large_image')),
  ADD COLUMN IF NOT EXISTS featured_image_alt text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts (category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_ref ON public.blog_posts (author_ref_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled ON public.blog_posts (status, scheduled_at) WHERE status = 'scheduled';

-- 4. RLS — identical staff-write / public-read shape already used by
-- blog_posts and media_assets.
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.blog_categories, public.blog_tags, public.blog_authors, public.blog_post_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_categories, public.blog_tags, public.blog_authors, public.blog_post_tags TO authenticated;
GRANT ALL ON public.blog_categories, public.blog_tags, public.blog_authors, public.blog_post_tags TO service_role;

DROP POLICY IF EXISTS "blog_categories read" ON public.blog_categories;
CREATE POLICY "blog_categories read" ON public.blog_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "blog_categories staff insert" ON public.blog_categories;
CREATE POLICY "blog_categories staff insert" ON public.blog_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "blog_categories staff update" ON public.blog_categories;
CREATE POLICY "blog_categories staff update" ON public.blog_categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "blog_categories staff delete" ON public.blog_categories;
CREATE POLICY "blog_categories staff delete" ON public.blog_categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));

DROP POLICY IF EXISTS "blog_tags read" ON public.blog_tags;
CREATE POLICY "blog_tags read" ON public.blog_tags FOR SELECT USING (true);
DROP POLICY IF EXISTS "blog_tags staff insert" ON public.blog_tags;
CREATE POLICY "blog_tags staff insert" ON public.blog_tags FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "blog_tags staff update" ON public.blog_tags;
CREATE POLICY "blog_tags staff update" ON public.blog_tags FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "blog_tags staff delete" ON public.blog_tags;
CREATE POLICY "blog_tags staff delete" ON public.blog_tags FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));

DROP POLICY IF EXISTS "blog_authors read" ON public.blog_authors;
CREATE POLICY "blog_authors read" ON public.blog_authors FOR SELECT USING (true);
DROP POLICY IF EXISTS "blog_authors staff insert" ON public.blog_authors;
CREATE POLICY "blog_authors staff insert" ON public.blog_authors FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "blog_authors staff update" ON public.blog_authors;
CREATE POLICY "blog_authors staff update" ON public.blog_authors FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "blog_authors staff delete" ON public.blog_authors;
CREATE POLICY "blog_authors staff delete" ON public.blog_authors FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));

DROP POLICY IF EXISTS "blog_post_tags read" ON public.blog_post_tags;
CREATE POLICY "blog_post_tags read" ON public.blog_post_tags FOR SELECT USING (true);
DROP POLICY IF EXISTS "blog_post_tags staff insert" ON public.blog_post_tags;
CREATE POLICY "blog_post_tags staff insert" ON public.blog_post_tags FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "blog_post_tags staff delete" ON public.blog_post_tags;
CREATE POLICY "blog_post_tags staff delete" ON public.blog_post_tags FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));

-- 5. Seed the requested category set + a default author so new posts always
-- have somewhere to attach without a manual setup step first.
INSERT INTO public.blog_categories (slug, name) VALUES
  ('workouts', 'Workouts'),
  ('weight-loss', 'Weight Loss'),
  ('nutrition', 'Nutrition'),
  ('recipes', 'Recipes'),
  ('muscle-gain', 'Muscle Gain'),
  ('home-fitness', 'Home Fitness'),
  ('cardio', 'Cardio'),
  ('strength-training', 'Strength Training'),
  ('supplements', 'Supplements'),
  ('health-tips', 'Health Tips')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.blog_authors (slug, name, bio) VALUES
  ('fitplancoach-team', 'FitPlanCoach Team',
   'The coaches and content team behind FitPlanCoach, sharing practical training and nutrition guidance.')
ON CONFLICT (slug) DO NOTHING;


-- =====================================================================
-- STARTER CATALOG SEED (foods / workout_templates / exercises)
-- The RESET block at the top of this file DROPS these three tables, so this
-- seed MUST run in the same paste or generation has an empty catalog and
-- fails with "No foods are configured". Kept byte-identical to
-- supabase/seed.sql; each block clears its own table first, so re-running is
-- safe and never touches user/profile/subscription data.
-- =====================================================================
-- FitPlanCoach starter catalog: real foods + real workout programming.
-- Safe to re-run: each block clears its own table first (catalog data only,
-- never touches users/profiles/subscriptions/etc).

delete from public.foods;
delete from public.workout_templates;
delete from public.exercises;

insert into public.foods (name, country, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, category, budget_level) values
  ('Oats', 'global', 389, 16.9, 66.3, 6.9, 10.6, 'breakfast', 'low'),
  ('Eggs', 'global', 155, 13.0, 1.1, 11.0, 0, 'breakfast', 'low'),
  ('Banana', 'global', 89, 1.1, 22.8, 0.3, 2.6, 'breakfast', 'low'),
  ('Greek Yogurt (nonfat)', 'global', 59, 10.3, 3.6, 0.4, 0, 'breakfast', 'medium'),
  ('Whole Wheat Bread', 'global', 247, 13.0, 41.0, 3.4, 7.0, 'breakfast', 'medium'),
  ('Peanut Butter', 'global', 588, 25.0, 20.0, 50.0, 6.0, 'breakfast', 'medium'),
  ('Smoked Salmon', 'global', 117, 18.3, 0, 4.3, 0, 'breakfast', 'high'),
  ('Avocado', 'global', 160, 2.0, 8.5, 14.7, 6.7, 'breakfast', 'high'),
  ('Cottage Cheese', 'global', 98, 11.0, 3.4, 4.3, 0, 'breakfast', 'high'),
  ('White Rice (cooked)', 'global', 130, 2.7, 28.2, 0.3, 0.4, 'lunch', 'low'),
  ('Lentils (cooked)', 'global', 116, 9.0, 20.1, 0.4, 7.9, 'lunch', 'low'),
  ('Canned Tuna', 'global', 132, 28.0, 0, 1.3, 0, 'lunch', 'low'),
  ('Chicken Breast', 'global', 165, 31.0, 0, 3.6, 0, 'lunch', 'medium'),
  ('Pasta (cooked)', 'global', 131, 5.0, 25.0, 1.1, 1.8, 'lunch', 'medium'),
  ('Sweet Potato', 'global', 86, 1.6, 20.1, 0.1, 3.0, 'lunch', 'medium'),
  ('Salmon Fillet', 'global', 208, 20.0, 0, 13.4, 0, 'lunch', 'high'),
  ('Beef Sirloin', 'global', 271, 26.0, 0, 18.6, 0, 'lunch', 'high'),
  ('Quinoa (cooked)', 'global', 120, 4.4, 21.3, 1.9, 2.8, 'lunch', 'high'),
  ('Black Beans (cooked)', 'global', 127, 8.7, 22.8, 0.5, 8.7, 'dinner', 'low'),
  ('Potatoes (boiled)', 'global', 77, 2.0, 17.5, 0.1, 2.2, 'dinner', 'low'),
  ('Canned Tuna', 'global', 132, 28.0, 0, 1.3, 0, 'dinner', 'low'),
  ('Ground Beef 90/10', 'global', 176, 20.0, 0, 10.0, 0, 'dinner', 'medium'),
  ('Chicken Breast', 'global', 165, 31.0, 0, 3.6, 0, 'dinner', 'medium'),
  ('Brown Rice (cooked)', 'global', 123, 2.7, 25.6, 1.0, 1.6, 'dinner', 'medium'),
  ('Shrimp', 'global', 99, 24.0, 0.2, 0.3, 0, 'dinner', 'high'),
  ('Salmon Fillet', 'global', 208, 20.0, 0, 13.4, 0, 'dinner', 'high'),
  ('Steak (sirloin)', 'global', 271, 26.0, 0, 18.6, 0, 'dinner', 'high'),
  ('Apple', 'global', 52, 0.3, 13.8, 0.2, 2.4, 'snack', 'low'),
  ('Peanuts', 'global', 567, 25.8, 16.1, 49.2, 8.5, 'snack', 'low'),
  ('Rice Cakes', 'global', 387, 8.0, 81.0, 2.8, 4.0, 'snack', 'low'),
  ('Almonds', 'global', 579, 21.0, 21.6, 49.9, 12.5, 'snack', 'medium'),
  ('Part-Skim Mozzarella', 'global', 280, 28.0, 3.1, 17.1, 0, 'snack', 'medium'),
  ('Protein Bar', 'global', 350, 20.0, 40.0, 12.0, 8.0, 'snack', 'medium'),
  ('Mixed Nuts', 'global', 600, 20.0, 20.0, 52.0, 8.0, 'snack', 'high'),
  ('Beef Jerky', 'global', 410, 33.0, 11.0, 26.0, 1.5, 'snack', 'high'),
  ('Whey Protein Powder', 'global', 400, 80.0, 8.0, 6.0, 1.0, 'snack', 'high');

insert into public.workout_templates (name, goal, level, schedule) values
  ('Fat Loss — Full Body Starter', 'lose_fat', 'beginner', '[{"day": "Mon", "focus": "Full Body A", "items": [{"name": "Bodyweight Squat", "sets": 3, "reps": "15-20", "rest_seconds": 45}, {"name": "Push-Up (knee or full)", "sets": 3, "reps": "10-15", "rest_seconds": 45}, {"name": "Dumbbell Row", "sets": 3, "reps": "12-15", "rest_seconds": 45}, {"name": "Glute Bridge", "sets": 3, "reps": "15-20", "rest_seconds": 45}, {"name": "Plank", "sets": 3, "reps": "30-45s", "rest_seconds": 30}]}, {"day": "Wed", "focus": "Full Body B", "items": [{"name": "Walking Lunge", "sets": 3, "reps": "12/leg", "rest_seconds": 45}, {"name": "Incline Push-Up", "sets": 3, "reps": "12-15", "rest_seconds": 45}, {"name": "Lat Pulldown", "sets": 3, "reps": "12-15", "rest_seconds": 45}, {"name": "Step-Up", "sets": 3, "reps": "12/leg", "rest_seconds": 45}, {"name": "Mountain Climbers", "sets": 3, "reps": "30s", "rest_seconds": 30}]}, {"day": "Fri", "focus": "Full Body C + Cardio", "items": [{"name": "Goblet Squat", "sets": 3, "reps": "15", "rest_seconds": 45}, {"name": "Seated Row", "sets": 3, "reps": "12-15", "rest_seconds": 45}, {"name": "Dumbbell Shoulder Press", "sets": 3, "reps": "12-15", "rest_seconds": 45}, {"name": "Brisk Walk / Incline Treadmill", "sets": 1, "reps": "20 min", "rest_seconds": 0}]}]'::jsonb),
  ('Fat Loss — Upper/Lower Burn', 'lose_fat', 'intermediate', '[{"day": "Mon", "focus": "Lower Body", "items": [{"name": "Barbell Back Squat", "sets": 4, "reps": "10-12", "rest_seconds": 60}, {"name": "Romanian Deadlift", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Walking Lunge", "sets": 3, "reps": "12/leg", "rest_seconds": 45}, {"name": "Leg Press", "sets": 3, "reps": "15", "rest_seconds": 45}, {"name": "Standing Calf Raise", "sets": 3, "reps": "15-20", "rest_seconds": 30}]}, {"day": "Tue", "focus": "Upper Body", "items": [{"name": "Incline Dumbbell Press", "sets": 4, "reps": "10-12", "rest_seconds": 60}, {"name": "Seated Cable Row", "sets": 4, "reps": "10-12", "rest_seconds": 60}, {"name": "Lateral Raise", "sets": 3, "reps": "15", "rest_seconds": 30}, {"name": "Face Pull", "sets": 3, "reps": "15", "rest_seconds": 30}, {"name": "Triceps Pushdown", "sets": 3, "reps": "12-15", "rest_seconds": 30}]}, {"day": "Thu", "focus": "Lower Body + Core", "items": [{"name": "Deadlift", "sets": 4, "reps": "8-10", "rest_seconds": 75}, {"name": "Bulgarian Split Squat", "sets": 3, "reps": "10/leg", "rest_seconds": 45}, {"name": "Hip Thrust", "sets": 3, "reps": "12-15", "rest_seconds": 45}, {"name": "Hanging Knee Raise", "sets": 3, "reps": "15", "rest_seconds": 30}]}, {"day": "Fri", "focus": "Upper Body + Conditioning", "items": [{"name": "Pull-Up (assisted if needed)", "sets": 4, "reps": "8-10", "rest_seconds": 60}, {"name": "Dumbbell Bench Press", "sets": 4, "reps": "10-12", "rest_seconds": 60}, {"name": "Arnold Press", "sets": 3, "reps": "10-12", "rest_seconds": 45}, {"name": "Circuit: Burpees / KB Swings / Rowing", "sets": 3, "reps": "40s work / 20s rest", "rest_seconds": 20}]}]'::jsonb),
  ('Fat Loss — 5-Day Shred', 'lose_fat', 'advanced', '[{"day": "Mon", "focus": "Legs", "items": [{"name": "Barbell Back Squat", "sets": 5, "reps": "8-10", "rest_seconds": 75}, {"name": "Romanian Deadlift", "sets": 4, "reps": "10", "rest_seconds": 60}, {"name": "Walking Lunge", "sets": 3, "reps": "15/leg", "rest_seconds": 45}, {"name": "Leg Extension", "sets": 3, "reps": "15", "rest_seconds": 30}, {"name": "Seated Calf Raise", "sets": 4, "reps": "15-20", "rest_seconds": 30}]}, {"day": "Tue", "focus": "Push", "items": [{"name": "Barbell Bench Press", "sets": 5, "reps": "8-10", "rest_seconds": 75}, {"name": "Overhead Press", "sets": 4, "reps": "8-10", "rest_seconds": 60}, {"name": "Incline Dumbbell Press", "sets": 3, "reps": "10-12", "rest_seconds": 45}, {"name": "Lateral Raise", "sets": 3, "reps": "15", "rest_seconds": 30}, {"name": "Triceps Dip", "sets": 3, "reps": "12-15", "rest_seconds": 30}]}, {"day": "Wed", "focus": "Conditioning", "items": [{"name": "Circuit: Row / Bike / Burpees / KB Swing", "sets": 5, "reps": "45s work / 15s rest", "rest_seconds": 15}]}, {"day": "Thu", "focus": "Pull", "items": [{"name": "Deadlift", "sets": 5, "reps": "6-8", "rest_seconds": 90}, {"name": "Pull-Up", "sets": 4, "reps": "8-10", "rest_seconds": 60}, {"name": "Barbell Row", "sets": 4, "reps": "10", "rest_seconds": 60}, {"name": "Face Pull", "sets": 3, "reps": "15", "rest_seconds": 30}, {"name": "Barbell Curl", "sets": 3, "reps": "12", "rest_seconds": 30}]}, {"day": "Fri", "focus": "Full Body + Cardio Finisher", "items": [{"name": "Front Squat", "sets": 4, "reps": "10", "rest_seconds": 60}, {"name": "Push Press", "sets": 3, "reps": "8-10", "rest_seconds": 60}, {"name": "Chin-Up", "sets": 3, "reps": "AMRAP", "rest_seconds": 45}, {"name": "Sled Push / Sprint Intervals", "sets": 6, "reps": "20s", "rest_seconds": 40}]}]'::jsonb),
  ('Muscle Building — Foundations', 'build_muscle', 'beginner', '[{"day": "Mon", "focus": "Full Body A", "items": [{"name": "Barbell Back Squat", "sets": 3, "reps": "8-10", "rest_seconds": 90}, {"name": "Dumbbell Bench Press", "sets": 3, "reps": "8-10", "rest_seconds": 90}, {"name": "Seated Row", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Dumbbell Shoulder Press", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Plank", "sets": 3, "reps": "45s", "rest_seconds": 30}]}, {"day": "Wed", "focus": "Full Body B", "items": [{"name": "Romanian Deadlift", "sets": 3, "reps": "8-10", "rest_seconds": 90}, {"name": "Incline Push-Up", "sets": 3, "reps": "8-10", "rest_seconds": 90}, {"name": "Lat Pulldown", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Leg Press", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Dumbbell Curl", "sets": 3, "reps": "12", "rest_seconds": 45}]}, {"day": "Fri", "focus": "Full Body C", "items": [{"name": "Goblet Squat", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Dumbbell Row", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Overhead Press", "sets": 3, "reps": "8-10", "rest_seconds": 90}, {"name": "Leg Curl", "sets": 3, "reps": "12", "rest_seconds": 45}, {"name": "Triceps Pushdown", "sets": 3, "reps": "12", "rest_seconds": 45}]}]'::jsonb),
  ('Muscle Building — Upper/Lower Hypertrophy', 'build_muscle', 'intermediate', '[{"day": "Mon", "focus": "Upper", "items": [{"name": "Barbell Bench Press", "sets": 4, "reps": "8-10", "rest_seconds": 90}, {"name": "Barbell Row", "sets": 4, "reps": "8-10", "rest_seconds": 90}, {"name": "Overhead Press", "sets": 3, "reps": "8-10", "rest_seconds": 75}, {"name": "Lat Pulldown", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Barbell Curl", "sets": 3, "reps": "10-12", "rest_seconds": 45}, {"name": "Triceps Pushdown", "sets": 3, "reps": "10-12", "rest_seconds": 45}]}, {"day": "Tue", "focus": "Lower", "items": [{"name": "Barbell Back Squat", "sets": 4, "reps": "8-10", "rest_seconds": 90}, {"name": "Romanian Deadlift", "sets": 4, "reps": "8-10", "rest_seconds": 90}, {"name": "Leg Press", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Leg Curl", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Standing Calf Raise", "sets": 4, "reps": "12-15", "rest_seconds": 45}]}, {"day": "Thu", "focus": "Upper", "items": [{"name": "Incline Dumbbell Press", "sets": 4, "reps": "8-10", "rest_seconds": 75}, {"name": "Pull-Up", "sets": 4, "reps": "8-10", "rest_seconds": 75}, {"name": "Dumbbell Shoulder Press", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Seated Cable Row", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Hammer Curl", "sets": 3, "reps": "10-12", "rest_seconds": 45}]}, {"day": "Fri", "focus": "Lower", "items": [{"name": "Front Squat", "sets": 4, "reps": "8-10", "rest_seconds": 90}, {"name": "Hip Thrust", "sets": 4, "reps": "10-12", "rest_seconds": 75}, {"name": "Walking Lunge", "sets": 3, "reps": "12/leg", "rest_seconds": 60}, {"name": "Leg Extension", "sets": 3, "reps": "12-15", "rest_seconds": 45}, {"name": "Seated Calf Raise", "sets": 4, "reps": "12-15", "rest_seconds": 45}]}]'::jsonb),
  ('Muscle Building — Push/Pull/Legs', 'build_muscle', 'advanced', '[{"day": "Mon", "focus": "Push", "items": [{"name": "Barbell Bench Press", "sets": 5, "reps": "6-8", "rest_seconds": 120}, {"name": "Overhead Press", "sets": 4, "reps": "8-10", "rest_seconds": 90}, {"name": "Incline Dumbbell Press", "sets": 4, "reps": "8-10", "rest_seconds": 75}, {"name": "Lateral Raise", "sets": 4, "reps": "12-15", "rest_seconds": 45}, {"name": "Triceps Dip", "sets": 4, "reps": "10-12", "rest_seconds": 60}]}, {"day": "Tue", "focus": "Pull", "items": [{"name": "Deadlift", "sets": 5, "reps": "5-6", "rest_seconds": 150}, {"name": "Pull-Up (weighted if possible)", "sets": 4, "reps": "6-8", "rest_seconds": 90}, {"name": "Barbell Row", "sets": 4, "reps": "8-10", "rest_seconds": 90}, {"name": "Face Pull", "sets": 3, "reps": "15", "rest_seconds": 45}, {"name": "Barbell Curl", "sets": 4, "reps": "10-12", "rest_seconds": 60}]}, {"day": "Wed", "focus": "Legs", "items": [{"name": "Barbell Back Squat", "sets": 5, "reps": "6-8", "rest_seconds": 120}, {"name": "Romanian Deadlift", "sets": 4, "reps": "8-10", "rest_seconds": 90}, {"name": "Bulgarian Split Squat", "sets": 3, "reps": "10/leg", "rest_seconds": 60}, {"name": "Leg Curl", "sets": 3, "reps": "12", "rest_seconds": 45}, {"name": "Standing Calf Raise", "sets": 4, "reps": "12-15", "rest_seconds": 45}]}, {"day": "Thu", "focus": "Push", "items": [{"name": "Overhead Press", "sets": 5, "reps": "6-8", "rest_seconds": 120}, {"name": "Dumbbell Bench Press", "sets": 4, "reps": "8-10", "rest_seconds": 90}, {"name": "Cable Fly", "sets": 3, "reps": "12-15", "rest_seconds": 45}, {"name": "Triceps Pushdown", "sets": 4, "reps": "10-12", "rest_seconds": 45}]}, {"day": "Fri", "focus": "Pull", "items": [{"name": "Barbell Row", "sets": 5, "reps": "6-8", "rest_seconds": 120}, {"name": "Lat Pulldown", "sets": 4, "reps": "8-10", "rest_seconds": 75}, {"name": "Seated Cable Row", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Hammer Curl", "sets": 3, "reps": "10-12", "rest_seconds": 45}]}, {"day": "Sat", "focus": "Legs", "items": [{"name": "Front Squat", "sets": 5, "reps": "6-8", "rest_seconds": 120}, {"name": "Walking Lunge", "sets": 4, "reps": "12/leg", "rest_seconds": 60}, {"name": "Leg Press", "sets": 4, "reps": "10-12", "rest_seconds": 75}, {"name": "Seated Calf Raise", "sets": 4, "reps": "12-15", "rest_seconds": 45}]}]'::jsonb),
  ('Maintenance — Balanced Full Body', 'maintain', 'beginner', '[{"day": "Mon", "focus": "Full Body A", "items": [{"name": "Bodyweight Squat", "sets": 3, "reps": "12-15", "rest_seconds": 60}, {"name": "Push-Up", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Dumbbell Row", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Plank", "sets": 3, "reps": "30-45s", "rest_seconds": 30}]}, {"day": "Wed", "focus": "Full Body B", "items": [{"name": "Goblet Squat", "sets": 3, "reps": "12", "rest_seconds": 60}, {"name": "Dumbbell Shoulder Press", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Lat Pulldown", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Glute Bridge", "sets": 3, "reps": "15", "rest_seconds": 45}]}, {"day": "Fri", "focus": "Full Body C + Light Cardio", "items": [{"name": "Walking Lunge", "sets": 3, "reps": "10/leg", "rest_seconds": 45}, {"name": "Seated Row", "sets": 3, "reps": "12", "rest_seconds": 60}, {"name": "Incline Push-Up", "sets": 3, "reps": "12", "rest_seconds": 45}, {"name": "Brisk Walk", "sets": 1, "reps": "20 min", "rest_seconds": 0}]}]'::jsonb),
  ('Maintenance — Balanced Split', 'maintain', 'intermediate', '[{"day": "Mon", "focus": "Upper", "items": [{"name": "Dumbbell Bench Press", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Seated Row", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Dumbbell Shoulder Press", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Triceps Pushdown", "sets": 3, "reps": "12", "rest_seconds": 45}]}, {"day": "Tue", "focus": "Lower", "items": [{"name": "Barbell Back Squat", "sets": 3, "reps": "10-12", "rest_seconds": 75}, {"name": "Romanian Deadlift", "sets": 3, "reps": "10-12", "rest_seconds": 75}, {"name": "Leg Press", "sets": 3, "reps": "12", "rest_seconds": 60}, {"name": "Standing Calf Raise", "sets": 3, "reps": "15", "rest_seconds": 45}]}, {"day": "Thu", "focus": "Upper", "items": [{"name": "Pull-Up (assisted if needed)", "sets": 3, "reps": "8-10", "rest_seconds": 75}, {"name": "Incline Dumbbell Press", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Face Pull", "sets": 3, "reps": "15", "rest_seconds": 45}, {"name": "Barbell Curl", "sets": 3, "reps": "12", "rest_seconds": 45}]}, {"day": "Fri", "focus": "Lower + Core", "items": [{"name": "Walking Lunge", "sets": 3, "reps": "12/leg", "rest_seconds": 60}, {"name": "Hip Thrust", "sets": 3, "reps": "12-15", "rest_seconds": 60}, {"name": "Leg Curl", "sets": 3, "reps": "12", "rest_seconds": 45}, {"name": "Hanging Knee Raise", "sets": 3, "reps": "15", "rest_seconds": 30}]}]'::jsonb),
  ('Maintenance — Athletic Upkeep', 'maintain', 'advanced', '[{"day": "Mon", "focus": "Push", "items": [{"name": "Barbell Bench Press", "sets": 4, "reps": "8-10", "rest_seconds": 90}, {"name": "Overhead Press", "sets": 3, "reps": "8-10", "rest_seconds": 75}, {"name": "Lateral Raise", "sets": 3, "reps": "12-15", "rest_seconds": 45}, {"name": "Triceps Dip", "sets": 3, "reps": "10-12", "rest_seconds": 45}]}, {"day": "Tue", "focus": "Pull", "items": [{"name": "Deadlift", "sets": 4, "reps": "6-8", "rest_seconds": 120}, {"name": "Pull-Up", "sets": 3, "reps": "8-10", "rest_seconds": 75}, {"name": "Barbell Row", "sets": 3, "reps": "10", "rest_seconds": 75}, {"name": "Barbell Curl", "sets": 3, "reps": "10-12", "rest_seconds": 45}]}, {"day": "Wed", "focus": "Conditioning", "items": [{"name": "Circuit: Row / Bike / Bodyweight Combo", "sets": 4, "reps": "40s work / 20s rest", "rest_seconds": 20}]}, {"day": "Thu", "focus": "Legs", "items": [{"name": "Barbell Back Squat", "sets": 4, "reps": "8-10", "rest_seconds": 90}, {"name": "Bulgarian Split Squat", "sets": 3, "reps": "10/leg", "rest_seconds": 60}, {"name": "Leg Curl", "sets": 3, "reps": "12", "rest_seconds": 45}, {"name": "Standing Calf Raise", "sets": 3, "reps": "15", "rest_seconds": 45}]}, {"day": "Fri", "focus": "Full Body", "items": [{"name": "Front Squat", "sets": 3, "reps": "10", "rest_seconds": 75}, {"name": "Incline Dumbbell Press", "sets": 3, "reps": "10", "rest_seconds": 60}, {"name": "Seated Cable Row", "sets": 3, "reps": "10-12", "rest_seconds": 60}, {"name": "Plank", "sets": 3, "reps": "45-60s", "rest_seconds": 30}]}]'::jsonb);

insert into public.exercises (name, muscle_group, equipment, difficulty, instructions, common_mistakes, breathing_tip, safety_tip) values
  ('Barbell Back Squat', 'Legs', 'Barbell', 'intermediate', ARRAY['Set the bar on your upper traps, feet shoulder-width apart.','Brace your core, push hips back and bend knees to descend until thighs are at least parallel.','Drive through your whole foot to stand back up, keeping your chest up.']::text[], ARRAY['Letting the knees cave inward on the way up.','Rounding the lower back at the bottom of the squat.']::text[], 'Inhale and brace before descending; exhale as you drive up past the sticking point.', 'Use a squat rack with safety pins set just below your bottom position.'),
  ('Front Squat', 'Legs', 'Barbell', 'advanced', ARRAY['Rest the bar on your front shoulders, elbows lifted high.','Keep your torso upright as you squat down, knees tracking over toes.','Drive up through your heels, keeping elbows up throughout.']::text[], ARRAY['Letting the elbows drop, which tips the bar forward.','Leaning the torso too far forward.']::text[], 'Brace hard before unracking; exhale on the way up.', 'Start light until your wrist/shoulder mobility allows a comfortable rack position.'),
  ('Bodyweight Squat', 'Legs', 'None', 'beginner', ARRAY['Stand with feet shoulder-width apart, toes slightly out.','Push hips back and bend knees to lower until thighs are parallel or below.','Drive through your heels to return to standing.']::text[], ARRAY['Rising onto the toes instead of staying flat-footed.','Not squatting to full depth.']::text[], 'Inhale on the way down, exhale as you stand.', 'Keep knees tracking in line with your toes throughout.'),
  ('Goblet Squat', 'Legs', 'Dumbbell', 'beginner', ARRAY['Hold a dumbbell vertically against your chest with both hands.','Squat down between your knees, keeping your torso tall.','Push through your heels to stand, squeezing glutes at the top.']::text[], ARRAY['Letting the weight pull the chest forward.','Squatting too fast without control.']::text[], 'Inhale at the top, exhale as you push up.', 'Keep the dumbbell close to your chest to protect your lower back.'),
  ('Romanian Deadlift', 'Hamstrings', 'Barbell', 'intermediate', ARRAY['Hold the bar at hip height, feet hip-width apart, slight knee bend.','Hinge at the hips, pushing them back while lowering the bar along your legs.','Feel a stretch in your hamstrings, then drive hips forward to stand tall.']::text[], ARRAY['Bending the knees too much, turning it into a squat.','Rounding the lower back during the hinge.']::text[], 'Inhale as you hinge down, exhale as you stand back up.', 'Keep the bar close to your legs the entire time to protect your lower back.'),
  ('Deadlift', 'Back', 'Barbell', 'advanced', ARRAY['Stand with the bar over mid-foot, grip just outside your legs.','Brace your core, flatten your back, and drive through the floor to stand up.','Lock out hips and knees together at the top, then lower with control.']::text[], ARRAY['Rounding the lower back when the bar leaves the floor.','Jerking the bar instead of a smooth, controlled pull.']::text[], 'Take a big breath and brace before the pull; exhale after passing your knees.', 'Keep the bar in contact with your legs throughout the lift.'),
  ('Walking Lunge', 'Legs', 'Dumbbell', 'beginner', ARRAY['Stand tall, then step forward into a lunge, lowering your back knee toward the floor.','Push through your front heel to stand and step into the next lunge with the other leg.','Continue alternating legs as you walk forward.']::text[], ARRAY['Letting the front knee travel far past the toes.','Taking steps too short, limiting range of motion.']::text[], 'Inhale as you lower, exhale as you drive up into the next step.', 'Perform in an open space with enough room to walk several steps forward.'),
  ('Bulgarian Split Squat', 'Legs', 'Dumbbell', 'intermediate', ARRAY['Stand ~2 feet in front of a bench, resting one foot on it behind you.','Lower your back knee toward the floor, front knee tracking over the foot.','Push through your front heel to return to standing.']::text[], ARRAY['Placing the front foot too close to the bench, overloading the knee.','Letting the front knee cave inward.']::text[], 'Inhale on the descent, exhale as you drive up.', 'Hold onto something for balance until you''re confident with the movement.'),
  ('Leg Press', 'Legs', 'Machine', 'beginner', ARRAY['Sit in the leg press machine, feet shoulder-width apart on the platform.','Lower the platform by bending your knees toward your chest.','Press through your heels to extend your legs, without locking your knees hard.']::text[], ARRAY['Letting the knees cave inward under load.','Locking the knees out aggressively at the top.']::text[], 'Inhale as you lower, exhale as you press.', 'Keep your lower back pressed against the pad throughout — don''t let your hips lift off.'),
  ('Leg Curl', 'Hamstrings', 'Machine', 'beginner', ARRAY['Lie face down on the leg curl machine, pad against your lower calves.','Curl your heels toward your glutes, squeezing your hamstrings.','Lower with control back to the starting position.']::text[], ARRAY['Using momentum to jerk the weight up.','Lifting the hips off the pad during the curl.']::text[], 'Exhale as you curl, inhale as you lower.', 'Keep your hips pressed into the pad throughout the movement.'),
  ('Leg Extension', 'Quads', 'Machine', 'beginner', ARRAY['Sit in the leg extension machine, pad resting against your shins.','Extend your legs until they''re straight, squeezing your quads at the top.','Lower with control back to the starting position.']::text[], ARRAY['Using momentum to kick the weight up.','Locking the knees out harshly at the top.']::text[], 'Exhale as you extend, inhale as you lower.', 'Use a controlled weight — this movement places direct stress on the knee joint.'),
  ('Hip Thrust', 'Glutes', 'Barbell', 'intermediate', ARRAY['Sit with your upper back against a bench, a loaded bar over your hips.','Drive through your heels to raise your hips until your torso is parallel to the floor.','Squeeze your glutes hard at the top, then lower under control.']::text[], ARRAY['Overextending the back at lockout.','Letting the knees cave inward during the drive.']::text[], 'Exhale at the top, inhale on the way down.', 'Use a barbell pad — this movement puts direct pressure on the hip crease.'),
  ('Standing Calf Raise', 'Calves', 'Machine', 'beginner', ARRAY['Stand on the balls of your feet on a raised platform or flat ground.','Rise up onto your toes as high as possible.','Lower your heels below the platform level for a full stretch, then repeat.']::text[], ARRAY['Bouncing at the bottom instead of controlling the stretch.','Only using a small range of motion.']::text[], 'Exhale as you rise, inhale as you lower.', 'Hold onto something stable for balance if working on an elevated surface.'),
  ('Seated Calf Raise', 'Calves', 'Machine', 'beginner', ARRAY['Sit with the balls of your feet on a platform, weight resting on your knees.','Rise up onto your toes as high as possible.','Lower your heels for a full stretch, then repeat.']::text[], ARRAY['Rushing through reps instead of pausing at the top.','Not achieving a full stretch at the bottom.']::text[], 'Exhale as you press up, inhale as you lower.', 'Keep the weight controlled — don''t let it slam down on your knees.'),
  ('Step-Up', 'Legs', 'Dumbbell', 'beginner', ARRAY['Stand in front of a bench or box, one foot planted on top.','Drive through that foot to step up, bringing the other knee up.','Lower with control back to the starting position and repeat.']::text[], ARRAY['Pushing off the bottom leg instead of driving through the top leg.','Using a box too high for your current strength/mobility.']::text[], 'Exhale as you step up, inhale as you lower.', 'Choose a stable, non-slip box or bench at an appropriate height.'),
  ('Barbell Bench Press', 'Chest', 'Barbell', 'intermediate', ARRAY['Lie on the bench, grip the bar slightly wider than shoulder-width.','Lower the bar to your mid-chest with control, elbows at roughly 45 degrees.','Press the bar back up to full arm extension.']::text[], ARRAY['Flaring the elbows straight out to the sides.','Bouncing the bar off the chest.']::text[], 'Inhale as you lower the bar, exhale as you press up.', 'Always use a spotter or safety bars when lifting heavy.'),
  ('Dumbbell Bench Press', 'Chest', 'Dumbbell', 'beginner', ARRAY['Lie on a bench holding a dumbbell in each hand at chest level.','Press the dumbbells up until your arms are extended, without locking out hard.','Lower them with control back to chest level.']::text[], ARRAY['Letting the dumbbells drift too far apart or crash together.','Arching the lower back excessively.']::text[], 'Inhale on the way down, exhale as you press up.', 'Get the dumbbells into position with your knees, not by swinging them up.'),
  ('Incline Dumbbell Press', 'Chest', 'Dumbbell', 'intermediate', ARRAY['Set a bench to a 30-45 degree incline and hold a dumbbell in each hand at chest level.','Press the dumbbells up and slightly inward until arms are extended.','Lower with control back to the starting position.']::text[], ARRAY['Setting the incline too steep, turning it into a shoulder press.','Using too much momentum.']::text[], 'Inhale on the way down, exhale as you press.', 'Choose a weight you can control through the full range — don''t let the shoulders round forward.'),
  ('Push-Up', 'Chest', 'None', 'beginner', ARRAY['Start in a plank position, hands slightly wider than shoulders.','Lower your chest toward the floor, keeping your body in a straight line.','Push back up to the starting position.']::text[], ARRAY['Letting the hips sag or pike up.','Only lowering halfway instead of a full range.']::text[], 'Inhale as you lower, exhale as you push up.', 'Keep your core braced throughout to protect your lower back.'),
  ('Incline Push-Up', 'Chest', 'None', 'beginner', ARRAY['Place your hands on a raised surface like a bench or step.','Lower your chest toward the surface, keeping your body straight.','Push back up to the starting position.']::text[], ARRAY['Letting the hips drop below body line.','Placing hands too high, reducing the challenge too much.']::text[], 'Inhale as you lower, exhale as you push up.', 'Make sure the elevated surface is stable before loading it with your weight.'),
  ('Cable Fly', 'Chest', 'Cable', 'intermediate', ARRAY['Stand between two cable towers, handles at chest height, slight forward lean.','With a slight bend in the elbows, bring your hands together in front of your chest.','Slowly return to the starting position, feeling a stretch across the chest.']::text[], ARRAY['Bending the elbows too much, turning it into a press.','Using too much weight and losing control of the stretch.']::text[], 'Exhale as you bring the hands together, inhale as you open back up.', 'Keep a slight bend in the elbows throughout to protect the joint.'),
  ('Overhead Press', 'Shoulders', 'Barbell', 'intermediate', ARRAY['Hold the bar at shoulder height, hands just outside shoulder-width.','Brace your core and press the bar straight overhead, moving your head slightly back then through.','Lower the bar back to shoulder height with control.']::text[], ARRAY['Arching the lower back excessively to press the weight up.','Pressing the bar forward instead of straight up.']::text[], 'Inhale before pressing, exhale as the bar passes your head.', 'Squeeze your glutes and brace your core to protect your lower back.'),
  ('Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell', 'beginner', ARRAY['Hold a dumbbell in each hand at shoulder height, palms facing forward.','Press the dumbbells overhead until your arms are extended.','Lower them back to shoulder height with control.']::text[], ARRAY['Arching the back to press the weight up.','Letting the dumbbells drift forward instead of tracking overhead.']::text[], 'Inhale as you lower, exhale as you press up.', 'Keep your core braced to avoid overextending your lower back.'),
  ('Arnold Press', 'Shoulders', 'Dumbbell', 'intermediate', ARRAY['Hold dumbbells at shoulder height, palms facing your body.','As you press overhead, rotate your palms to face forward.','Reverse the rotation as you lower back to the starting position.']::text[], ARRAY['Rushing the rotation instead of controlling it.','Using momentum instead of shoulder strength.']::text[], 'Inhale as you lower and rotate in, exhale as you press and rotate out.', 'Start with lighter weight until the rotation feels natural.'),
  ('Lateral Raise', 'Shoulders', 'Dumbbell', 'beginner', ARRAY['Hold a dumbbell in each hand at your sides, slight bend in the elbows.','Raise your arms out to the sides until they reach shoulder height.','Lower with control back to the starting position.']::text[], ARRAY['Using momentum to swing the weights up.','Raising the arms above shoulder height, straining the joint.']::text[], 'Exhale as you raise, inhale as you lower.', 'Use a lighter weight than you think — this is an isolation movement, not a strength lift.'),
  ('Push Press', 'Shoulders', 'Barbell', 'advanced', ARRAY['Hold the bar at shoulder height, feet hip-width apart.','Dip your knees slightly, then explosively drive up, using leg power to help press the bar overhead.','Lower the bar back to shoulder height and reset.']::text[], ARRAY['Turning the dip into a full squat.','Losing core brace during the drive.']::text[], 'Take a breath and brace before the dip; exhale as the bar locks out overhead.', 'Master the strict overhead press before adding the leg drive.'),
  ('Barbell Row', 'Back', 'Barbell', 'intermediate', ARRAY['Hinge forward holding the bar with an overhand grip, back flat.','Pull the bar toward your lower ribs, squeezing your shoulder blades together.','Lower the bar with control back to the starting position.']::text[], ARRAY['Standing too upright, turning it into a shrug.','Using momentum to jerk the weight up.']::text[], 'Exhale as you pull, inhale as you lower.', 'Keep your back flat throughout — never let it round under load.'),
  ('Dumbbell Row', 'Back', 'Dumbbell', 'beginner', ARRAY['Support one knee and hand on a bench, holding a dumbbell in the other hand.','Pull the dumbbell toward your hip, squeezing your shoulder blade back.','Lower with control back to the starting position.']::text[], ARRAY['Rotating the torso to help lift the weight.','Using a jerky, momentum-driven pull.']::text[], 'Exhale as you pull, inhale as you lower.', 'Keep your back flat and parallel to the floor throughout.'),
  ('Seated Row', 'Back', 'Machine', 'beginner', ARRAY['Sit at the row machine, feet braced, holding the handle with arms extended.','Pull the handle toward your torso, squeezing your shoulder blades together.','Extend your arms back out with control.']::text[], ARRAY['Rounding the back to add range of motion.','Using the arms only instead of driving with the back.']::text[], 'Exhale as you pull, inhale as you extend.', 'Keep your torso upright throughout — avoid leaning back excessively.'),
  ('Seated Cable Row', 'Back', 'Cable', 'beginner', ARRAY['Sit at the cable row station, feet braced, holding the handle with arms extended.','Pull the handle toward your torso, elbows close to your body, squeezing your shoulder blades.','Extend your arms back out with control, feeling a stretch.']::text[], ARRAY['Leaning too far back to cheat the pull.','Shrugging the shoulders instead of pulling with the back.']::text[], 'Exhale as you pull, inhale as you extend.', 'Keep a slight bend in the knees and a neutral spine throughout.'),
  ('Lat Pulldown', 'Back', 'Cable', 'beginner', ARRAY['Sit at the pulldown station, grip the bar wider than shoulder-width.','Pull the bar down toward your upper chest, driving your elbows down and back.','Extend your arms back up with control.']::text[], ARRAY['Leaning back excessively to use body momentum.','Pulling the bar behind the neck, which strains the shoulders.']::text[], 'Exhale as you pull down, inhale as you extend.', 'Keep your torso mostly upright with only a slight backward lean.'),
  ('Pull-Up', 'Back', 'None', 'intermediate', ARRAY['Hang from a bar with an overhand grip, hands slightly wider than shoulders.','Pull your chest toward the bar, driving your elbows down.','Lower with control back to a full hang.']::text[], ARRAY['Using a kipping/swinging motion instead of a controlled pull.','Not achieving a full hang at the bottom.']::text[], 'Exhale as you pull up, inhale as you lower.', 'Build up with assisted or negative pull-ups if you can''t yet do a full rep.'),
  ('Chin-Up', 'Back', 'None', 'intermediate', ARRAY['Hang from a bar with an underhand grip, hands shoulder-width apart.','Pull your chin over the bar, keeping your elbows close to your body.','Lower with control back to a full hang.']::text[], ARRAY['Only performing a partial range of motion.','Using momentum to swing up.']::text[], 'Exhale as you pull up, inhale as you lower.', 'Warm up your elbows well — the underhand grip places more stress on the biceps tendon.'),
  ('Face Pull', 'Shoulders', 'Cable', 'beginner', ARRAY['Set a cable or band at head height, grip with both hands.','Pull toward your face, leading with your elbows and separating your hands.','Squeeze your rear shoulders at the end, then return with control.']::text[], ARRAY['Pulling with the arms instead of the rear shoulders.','Using too much weight and losing the pulling path.']::text[], 'Exhale as you pull, inhale as you return.', 'Keep the movement slow and controlled — this exercise is about quality, not weight.'),
  ('Barbell Curl', 'Biceps', 'Barbell', 'beginner', ARRAY['Stand holding the bar with an underhand grip, hands shoulder-width apart.','Curl the bar up toward your shoulders, keeping elbows pinned at your sides.','Lower with control back to full arm extension.']::text[], ARRAY['Swinging the torso to help lift the weight.','Letting the elbows drift forward.']::text[], 'Exhale as you curl up, inhale as you lower.', 'Keep your wrists neutral — avoid excessive bending at the top.'),
  ('Dumbbell Curl', 'Biceps', 'Dumbbell', 'beginner', ARRAY['Stand holding a dumbbell in each hand, arms fully extended.','Curl the dumbbells up toward your shoulders, keeping elbows still.','Lower with control back to the starting position.']::text[], ARRAY['Using momentum to swing the weights up.','Letting the elbows drift forward or backward.']::text[], 'Exhale as you curl, inhale as you lower.', 'Keep the elbows pinned to your sides throughout the movement.'),
  ('Hammer Curl', 'Biceps', 'Dumbbell', 'beginner', ARRAY['Stand holding a dumbbell in each hand, palms facing your body.','Curl the dumbbells up while keeping your palms facing inward.','Lower with control back to the starting position.']::text[], ARRAY['Rotating the wrists during the curl.','Using body momentum to swing the weight up.']::text[], 'Exhale as you curl, inhale as you lower.', 'Keep your elbows stationary at your sides throughout.'),
  ('Triceps Pushdown', 'Triceps', 'Cable', 'beginner', ARRAY['Stand at a cable station, grip the bar or rope with elbows at your sides.','Push the attachment down until your arms are fully extended.','Return with control back to the starting position.']::text[], ARRAY['Letting the elbows flare away from the body.','Using body weight to lean into the movement.']::text[], 'Exhale as you push down, inhale as you return.', 'Keep your elbows pinned to your sides throughout the movement.'),
  ('Triceps Dip', 'Triceps', 'None', 'intermediate', ARRAY['Support yourself on parallel bars or a bench, arms extended.','Lower your body by bending your elbows until they reach about 90 degrees.','Push back up to full arm extension.']::text[], ARRAY['Descending too deep, straining the shoulders.','Flaring the elbows out wide instead of keeping them back.']::text[], 'Inhale as you lower, exhale as you push up.', 'Keep your shoulders down and back, away from your ears, throughout.'),
  ('Plank', 'Core', 'None', 'beginner', ARRAY['Support yourself on your forearms and toes, body in a straight line.','Brace your core and squeeze your glutes to keep hips level.','Hold the position for the target time.']::text[], ARRAY['Letting the hips sag toward the floor.','Piking the hips up too high.']::text[], 'Breathe steadily throughout — don''t hold your breath.', 'Stop if you feel lower back pain — that usually means the hips have sagged.'),
  ('Hanging Knee Raise', 'Core', 'None', 'intermediate', ARRAY['Hang from a pull-up bar with arms fully extended.','Raise your knees toward your chest, curling your pelvis slightly.','Lower with control back to a full hang.']::text[], ARRAY['Swinging the body to use momentum instead of the abs.','Only lifting the legs a small amount.']::text[], 'Exhale as you raise the knees, inhale as you lower.', 'Keep the movement slow and controlled to avoid swinging on the bar.'),
  ('Mountain Climbers', 'Core', 'None', 'beginner', ARRAY['Start in a high plank position, hands under shoulders.','Drive one knee toward your chest, then quickly switch legs.','Continue alternating at a controlled, sustainable pace.']::text[], ARRAY['Letting the hips pop up high instead of staying level.','Losing core brace as speed increases.']::text[], 'Breathe rhythmically with the leg switches — don''t hold your breath.', 'Slow down if your form starts to break down — quality over speed.'),
  ('Glute Bridge', 'Glutes', 'None', 'beginner', ARRAY['Lie on your back, knees bent, feet flat hip-width apart.','Drive through your heels to lift your hips toward the ceiling.','Squeeze your glutes at the top, then lower with control.']::text[], ARRAY['Pushing through the toes instead of the heels.','Overextending the lower back at the top.']::text[], 'Exhale as you lift, inhale as you lower.', 'Keep your chin tucked and avoid straining your neck.'),
  ('Jump Squat', 'Legs', 'None', 'intermediate', ARRAY['Perform a bodyweight squat, then explode upward into a jump.','Land softly with bent knees, absorbing the impact.','Reset your stance and repeat immediately or after a brief pause.']::text[], ARRAY['Landing with locked-out, stiff knees.','Losing core brace on landing, causing the back to round.']::text[], 'Exhale forcefully on the jump; inhale on the landing/reset.', 'Land on a surface with good grip and avoid this move on unstable ground.'),
  ('Dumbbell Romanian Deadlift', 'Hamstrings', 'Dumbbell', 'beginner', ARRAY['Hold a dumbbell in each hand in front of your thighs.','Hinge at the hips, pushing them back as the weights slide down your legs.','Squeeze your glutes to return to standing.']::text[], ARRAY['Rounding the back instead of hinging from the hips.','Letting the dumbbells drift away from the legs.']::text[], 'Inhale on the way down, exhale driving the hips forward.', 'Stop the descent once you feel a hamstring stretch, not when your back rounds.'),
  ('Dumbbell Deadlift', 'Back', 'Dumbbell', 'beginner', ARRAY['Stand with dumbbells at your sides, feet hip-width apart.','Push hips back and bend knees slightly, lowering the weights along your legs.','Drive through your heels and stand tall, squeezing glutes at the top.']::text[], ARRAY['Squatting the weight up instead of hinging.','Letting the shoulders round forward.']::text[], 'Brace before lowering; exhale as you stand up.', 'Keep your back flat throughout — stop the range if you feel it rounding.'),
  ('Single-Leg Glute Bridge', 'Glutes', 'None', 'beginner', ARRAY['Lie on your back, one foot flat on the floor, the other leg extended.','Drive through the planted heel to lift your hips until your body is a straight line.','Lower with control and repeat, then switch legs.']::text[], ARRAY['Overarching the lower back instead of using the glutes.','Letting the hips tilt to one side.']::text[], 'Exhale as you lift the hips, inhale as you lower.', 'Keep the movement slow and controlled — this is a stability exercise, not a speed one.'),
  ('Glute Bridge March', 'Hamstrings', 'None', 'beginner', ARRAY['Set up in a glute bridge position with hips raised.','Keeping hips level, lift one foot off the floor toward your chest.','Lower it back down and repeat on the other side without dropping your hips.']::text[], ARRAY['Letting the hips dip when lifting a foot.','Rushing the tempo instead of controlling each rep.']::text[], 'Exhale as you lift each knee, inhale as you lower it.', 'Keep your hips square — if they start to sag, lower them and reset.'),
  ('Wall Sit', 'Quads', 'None', 'beginner', ARRAY['Lean your back against a wall and slide down until knees are at ~90 degrees.','Keep feet flat, shins vertical, and hold the position.','Push through your heels to slide back up when finished.']::text[], ARRAY['Letting the knees drift past the toes.','Holding your breath instead of breathing steadily.']::text[], 'Breathe steadily throughout the hold — don''t hold your breath.', 'Stop if you feel sharp knee pain; mild burning in the thighs is expected.'),
  ('Dumbbell Hip Thrust', 'Glutes', 'Dumbbell', 'beginner', ARRAY['Sit with upper back against a bench, a dumbbell resting on your hips.','Drive through your heels to lift your hips until your torso is parallel to the floor.','Squeeze your glutes at the top, then lower with control.']::text[], ARRAY['Hyperextending the lower back instead of stopping at a straight line.','Pushing through the toes instead of the heels.']::text[], 'Exhale forcefully at the top of the thrust, inhale as you lower.', 'Pad the dumbbell placement or use a barbell pad to protect your hip bones.'),
  ('Calf Raise', 'Calves', 'None', 'beginner', ARRAY['Stand with feet hip-width apart, holding a wall or chair for balance if needed.','Rise up onto the balls of your feet as high as you can.','Lower your heels back down with control and repeat.']::text[], ARRAY['Using momentum instead of a controlled, full range of motion.','Letting the ankles roll outward.']::text[], 'Exhale as you rise, inhale as you lower.', 'Perform on a stable, flat surface to avoid ankle rolls.'),
  ('Single-Leg Calf Raise', 'Calves', 'None', 'intermediate', ARRAY['Stand on one foot, holding a wall for balance.','Rise up onto the ball of that foot as high as possible.','Lower with control, completing all reps before switching legs.']::text[], ARRAY['Letting the standing knee bend to cheat the range of motion.','Rushing the tempo.']::text[], 'Exhale as you rise, inhale as you lower.', 'Keep a hand nearby for balance since this is a single-leg movement.'),
  ('Decline Push-Up', 'Chest', 'None', 'intermediate', ARRAY['Place your feet on a raised surface, hands on the floor shoulder-width apart.','Lower your chest toward the floor, keeping your body straight.','Push back up to full arm extension.']::text[], ARRAY['Letting the hips sag as fatigue sets in.','Flaring elbows out to 90 degrees.']::text[], 'Inhale as you lower, exhale as you push up.', 'Start with a lower elevation until you build the shoulder strength for this harder variation.'),
  ('Wide Push-Up', 'Chest', 'None', 'beginner', ARRAY['Start in a plank position with hands wider than shoulder-width.','Lower your chest toward the floor, elbows flaring slightly outward.','Push back up to the starting position.']::text[], ARRAY['Placing hands so wide it strains the shoulders.','Letting the lower back sag.']::text[], 'Inhale as you lower, exhale as you push up.', 'Reduce the width if you feel any shoulder discomfort.'),
  ('Pike Push-Up', 'Shoulders', 'None', 'intermediate', ARRAY['Start in a downward-dog position, hips high, hands and feet on the floor.','Bend your elbows to lower the top of your head toward the floor.','Push back up through your hands to the starting position.']::text[], ARRAY['Letting the hips drop toward the floor during the movement.','Not lowering far enough to challenge the shoulders.']::text[], 'Inhale as you lower, exhale as you push up.', 'Keep your neck neutral — don''t let the head jut forward at the bottom.'),
  ('Dumbbell Push Press', 'Shoulders', 'Dumbbell', 'intermediate', ARRAY['Hold a dumbbell in each hand at shoulder height.','Dip your knees slightly, then drive up explosively, pressing the dumbbells overhead.','Lower them back to shoulder height with control and reset.']::text[], ARRAY['Pressing with the arms alone without leg drive.','Losing balance on the drive due to poor bracing.']::text[], 'Brace before the dip, exhale as the dumbbells lock out overhead.', 'Keep your core tight throughout to protect your spine during the explosive drive.'),
  ('Superman Row', 'Back', 'None', 'beginner', ARRAY['Lie face down, arms extended in front of you.','Lift your chest and pull your elbows back as if rowing, squeezing your shoulder blades.','Lower with control and repeat.']::text[], ARRAY['Using a fast, jerky motion instead of a controlled squeeze.','Lifting too high and straining the lower back.']::text[], 'Exhale as you pull back, inhale as you lower.', 'Keep the range of motion moderate — this is a bodyweight back activation exercise, not a heavy row.'),
  ('Rear Delt Fly', 'Shoulders', 'Dumbbell', 'beginner', ARRAY['Hinge forward at the hips holding a dumbbell in each hand.','With a slight elbow bend, raise your arms out to the sides, squeezing your shoulder blades.','Lower with control back to the starting position.']::text[], ARRAY['Standing too upright, turning it into a shrug.','Using momentum instead of controlled rear-delt tension.']::text[], 'Exhale as you raise, inhale as you lower.', 'Keep a soft bend in the knees and a flat back throughout the hinge.'),
  ('Lying Leg Raise', 'Core', 'None', 'beginner', ARRAY['Lie on your back, legs extended, hands at your sides or under your hips.','Raise your legs toward the ceiling, keeping them straight.','Lower with control until just before your lower back arches off the floor.']::text[], ARRAY['Letting the lower back arch off the floor.','Using momentum to swing the legs up.']::text[], 'Exhale as you raise the legs, inhale as you lower.', 'Keep your lower back pressed into the floor throughout — stop the descent if it starts to lift.'),
  ('Band Deadlift', 'Back', 'Resistance Band', 'beginner', ARRAY['Anchor a band under your feet, holding a handle in each hand at hip height.','Hinge at the hips, pushing them back as you lower your hands toward your shins.','Drive your hips forward to stand tall, squeezing your glutes at the top.']::text[], ARRAY['Rounding the back during the hinge.','Bending the knees too much, turning it into a squat.']::text[], 'Inhale as you hinge down, exhale as you stand up.', 'Check the band is securely anchored under both feet before pulling with force.'),
  ('Band Leg Curl', 'Hamstrings', 'Resistance Band', 'beginner', ARRAY['Lie face down with a band anchored in front of you, looped around one ankle.','Curl your heel toward your glutes against the band''s resistance.','Lower with control back to the starting position.']::text[], ARRAY['Using momentum instead of a controlled curl.','Lifting the hips off the floor.']::text[], 'Exhale as you curl, inhale as you lower.', 'Check the anchor point is secure before applying full resistance.'),
  ('Band Leg Extension', 'Quads', 'Resistance Band', 'beginner', ARRAY['Sit in a chair with a band anchored behind you, looped around one ankle.','Extend that leg forward against the band''s resistance.','Return with control back to the starting position.']::text[], ARRAY['Using momentum to kick the leg out.','Not controlling the return, letting the band snap the leg back.']::text[], 'Exhale as you extend, inhale as you return.', 'Sit on a stable chair or bench so you don''t tip during the movement.'),
  ('Band Chest Fly', 'Chest', 'Resistance Band', 'beginner', ARRAY['Anchor a band behind you at chest height, one handle in each hand.','With a slight elbow bend, bring your hands together in front of your chest.','Return slowly to the starting position, feeling a stretch across the chest.']::text[], ARRAY['Using the arms instead of squeezing the chest to bring hands together.','Letting the band go slack at the end range.']::text[], 'Exhale as you bring hands together, inhale as you return.', 'Check the band anchor is secure before pulling with force.'),
  ('Band Lateral Raise', 'Shoulders', 'Resistance Band', 'beginner', ARRAY['Stand on a resistance band, holding one handle in each hand at your sides.','Raise your arms out to the sides until they reach shoulder height.','Lower with control back to the starting position.']::text[], ARRAY['Shrugging the shoulders up instead of raising the arms.','Using a band with too much tension, forcing momentum.']::text[], 'Exhale as you raise, inhale as you lower.', 'Check the band for wear before use to avoid it snapping under tension.'),
  ('Band Row', 'Back', 'Resistance Band', 'beginner', ARRAY['Anchor a band in front of you, holding a handle in each hand, arms extended.','Pull your hands toward your torso, squeezing your shoulder blades together.','Extend your arms back out with control.']::text[], ARRAY['Using body momentum to yank the band back.','Not fully extending the arms between reps.']::text[], 'Exhale as you pull, inhale as you extend.', 'Check the anchor point is secure before pulling with full effort.'),
  ('Band Pulldown', 'Back', 'Resistance Band', 'beginner', ARRAY['Anchor a band overhead, holding a handle in each hand.','Pull your hands down and back toward your hips, squeezing your shoulder blades.','Return with control back to the starting position.']::text[], ARRAY['Using the arms only instead of engaging the back.','Rushing through reps without control.']::text[], 'Exhale as you pull down, inhale as you return.', 'Make sure the overhead anchor is secure and rated for the tension you''re applying.'),
  ('Band Face Pull', 'Shoulders', 'Resistance Band', 'beginner', ARRAY['Anchor a band at head height, grip with both hands.','Pull toward your face, elbows high and hands separating.','Squeeze the rear shoulders, then return with control.']::text[], ARRAY['Letting the shoulders shrug up toward the ears.','Pulling with a jerky rather than a smooth motion.']::text[], 'Exhale as you pull, inhale as you return.', 'Anchor the band securely at head height before adding tension.'),
  ('Band Curl', 'Biceps', 'Resistance Band', 'beginner', ARRAY['Stand on a resistance band, holding one handle in each hand.','Curl your hands up toward your shoulders, keeping elbows at your sides.','Lower with control back to the starting position.']::text[], ARRAY['Leaning back to help the band stretch.','Letting the elbows drift forward.']::text[], 'Exhale as you curl, inhale as you lower.', 'Check the band for any nicks or wear before use.'),
  ('Band Triceps Extension', 'Triceps', 'Resistance Band', 'beginner', ARRAY['Anchor a band overhead, hold the handle with both hands behind your head.','Extend your arms downward until they''re straight.','Return with control back to the starting position.']::text[], ARRAY['Flaring the elbows out during the extension.','Using the shoulders to drive the movement instead of the triceps.']::text[], 'Exhale as you extend, inhale as you return.', 'Keep your elbows pointed forward and stationary throughout.'),
  ('Plank Shoulder Tap', 'Shoulders', 'None', 'beginner', ARRAY['Start in a high plank position, hands under shoulders.','Lift one hand to tap the opposite shoulder, keeping hips as still as possible.','Return the hand to the floor and repeat on the other side.']::text[], ARRAY['Letting the hips rock side to side with each tap.','Rushing the taps instead of controlling the movement.']::text[], 'Breathe steadily throughout — don''t hold your breath.', 'Widen your feet stance for more stability if your hips are rocking too much.'),
  ('Prone Y-Raise', 'Shoulders', 'None', 'beginner', ARRAY['Lie face down, arms extended overhead in a Y shape, thumbs up.','Lift your arms and chest slightly off the floor, squeezing your shoulder blades.','Lower with control and repeat.']::text[], ARRAY['Using the lower back to jerk the body up instead of the shoulders.','Lifting the arms too high, straining the neck.']::text[], 'Exhale as you lift, inhale as you lower.', 'Keep the range of motion small and controlled — this is a light activation exercise.'),
  ('Towel Curl', 'Biceps', 'None', 'beginner', ARRAY['Hold a rolled towel with both hands, one end in each fist.','Curl one arm up while resisting with the other, creating tension through the towel.','Reverse direction slowly and repeat, alternating sides.']::text[], ARRAY['Not applying enough resistance to create real tension.','Moving too fast to actually load the biceps.']::text[], 'Breathe steadily throughout — exhale on the curling arm''s effort.', 'This is a light isometric-style substitute — don''t expect gym-level loading from it.');

-- =====================================================================
-- Owner/admin parity fix
-- =====================================================================
-- Every admin-gated write path in this schema is meant to also accept the
-- site owner (public.is_owner — the account granted the 'owner' role above,
-- see "Promote designated owner"), matching the convention already used by
-- most of the tables here (support_tickets, payment_settings, subscriptions'
-- user_roles policies, etc.). A handful of policies were written before
-- is_owner() existed and were never updated, so an owner account without a
-- *separate* literal 'admin' role row is silently rejected by RLS on these
-- specific writes — e.g. "Save all settings" in /admin/settings does
-- nothing (no error surfaced beyond a toast), and the owner can't manage the
-- foods/exercises/workout template catalog or other users' profiles either.
-- This section must stay at the end of the file: is_owner() and the
-- 'owner' enum value are only defined earlier in THIS file, and (like
-- every guarded DROP POLICY/CREATE POLICY pair elsewhere here) is a no-op
-- to re-run on a database that already has it applied.

-- app_settings
DROP POLICY IF EXISTS "admin write settings" ON public.app_settings;
CREATE POLICY "admin write settings" ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "admin upd settings" ON public.app_settings;
CREATE POLICY "admin upd settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "admin del settings" ON public.app_settings;
CREATE POLICY "admin del settings" ON public.app_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.is_owner(auth.uid()));

-- profiles
DROP POLICY IF EXISTS "users read own profile" ON public.profiles;
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "admins delete profile" ON public.profiles;
CREATE POLICY "admins delete profile" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));

-- foods
DROP POLICY IF EXISTS "admin write foods" ON public.foods;
CREATE POLICY "admin write foods" ON public.foods FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "admin update foods" ON public.foods;
CREATE POLICY "admin update foods" ON public.foods FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "admin delete foods" ON public.foods;
CREATE POLICY "admin delete foods" ON public.foods FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));

-- exercises
DROP POLICY IF EXISTS "admin insert exercises" ON public.exercises;
CREATE POLICY "admin insert exercises" ON public.exercises FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "admin update exercises" ON public.exercises;
CREATE POLICY "admin update exercises" ON public.exercises FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "admin delete exercises" ON public.exercises;
CREATE POLICY "admin delete exercises" ON public.exercises FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));

-- workout_templates
DROP POLICY IF EXISTS "admin ins wt" ON public.workout_templates;
CREATE POLICY "admin ins wt" ON public.workout_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "admin upd wt" ON public.workout_templates;
CREATE POLICY "admin upd wt" ON public.workout_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "admin del wt" ON public.workout_templates;
CREATE POLICY "admin del wt" ON public.workout_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));

-- analytics_events
DROP POLICY IF EXISTS "admin read events" ON public.analytics_events;
CREATE POLICY "admin read events" ON public.analytics_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.is_owner(auth.uid()));

-- =====================================================================
-- consume_plan_generation_credit: self-heal a missing subscriptions row
-- =====================================================================
-- handle_new_user() creates a subscriptions row for every new signup, but an
-- account whose row was lost for any reason (e.g. an existing account whose
-- data predates the fix earlier in this file that stopped full_schema.sql
-- from wiping non-catalog tables on re-paste) previously got permanently
-- blocked from ever generating a free plan: the UPDATE below matched zero
-- rows, v_count stayed NULL, and the function returned allowed=false —
-- indistinguishable from "limit reached" even though the user has never
-- generated a single plan. Fixed by creating the row first if it's missing.
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
#variable_conflict use_column
DECLARE
  v_count INT;
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, status)
    VALUES (p_user_id, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;

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
