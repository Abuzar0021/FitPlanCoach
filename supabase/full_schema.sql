-- FitPlanCoach — full database schema (all migrations concatenated in order).
-- Paste this whole file into your Supabase project's SQL Editor and Run.
-- Safe to run more than once (starts with a RESET block that drops its own
-- objects first) — e.g. after clearing tables by hand and needing a clean
-- re-apply. It never touches auth.users, so real accounts are preserved.

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

drop table if exists
  public.achievements,
  public.analytics_events,
  public.app_settings,
  public.billing_history,
  public.blog_posts,
  public.email_send_log,
  public.email_send_state,
  public.email_unsubscribe_tokens,
  public.exercises,
  public.feature_request_comments,
  public.feature_request_votes,
  public.feature_requests,
  public.foods,
  public.meal_plans,
  public.media_assets,
  public.notifications,
  public.payment_approvals,
  public.payment_settings,
  public.payment_submissions,
  public.profiles,
  public.progress_entries,
  public.subscriptions,
  public.support_ticket_messages,
  public.support_tickets,
  public.suppressed_emails,
  public.user_achievements,
  public.user_roles,
  public.webhook_events,
  public.workout_plans,
  public.workout_sessions,
  public.workout_templates
  cascade;

drop type if exists
  public.activity_level,
  public.app_role,
  public.billing_interval_kind,
  public.blog_status,
  public.budget_level,
  public.difficulty_level,
  public.feature_category,
  public.feature_status,
  public.fitness_goal,
  public.gender,
  public.meal_category,
  public.payment_method_kind,
  public.payment_submission_status,
  public.subscription_plan,
  public.subscription_status,
  public.ticket_status
  cascade;

-- =====================================================================
-- 20260622150818_dadbdba9-a9c8-4a38-8258-a709110c2c3a.sql
-- =====================================================================

-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.fitness_goal AS ENUM ('lose_fat', 'build_muscle', 'maintain');
CREATE TYPE public.activity_level AS ENUM ('sedentary', 'light', 'moderate', 'active');
CREATE TYPE public.budget_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.gender AS ENUM ('male', 'female', 'other');
CREATE TYPE public.difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE public.meal_category AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro', 'premium', 'elite');
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'cancelled', 'past_due');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================================
-- profiles
-- =========================================================
CREATE TABLE public.profiles (
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
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- user_roles + has_role
-- =========================================================
CREATE TABLE public.user_roles (
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

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- profile policies (needs has_role)
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
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
CREATE TABLE public.meal_plans (
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
CREATE POLICY "own meal plans" ON public.meal_plans FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid());

CREATE TABLE public.workout_plans (
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
CREATE POLICY "own workout plans" ON public.workout_plans FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid());

-- =========================================================
-- progress
-- =========================================================
CREATE TABLE public.progress_entries (
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
CREATE POLICY "own progress" ON public.progress_entries FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid());

-- =========================================================
-- subscriptions
-- =========================================================
CREATE TABLE public.subscriptions (
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
CREATE POLICY "own sub read" ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own sub upd self count" ON public.subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin sub insert" ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
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
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write settings" ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin upd settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin del settings" ON public.app_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- analytics_events
-- =========================================================
CREATE TABLE public.analytics_events (
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
CREATE POLICY "self insert events" ON public.analytics_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "admin read events" ON public.analytics_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX analytics_created_idx ON public.analytics_events(created_at DESC);
CREATE INDEX analytics_user_idx ON public.analytics_events(user_id, created_at DESC);


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
CREATE POLICY "user_roles_owner_insert"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_owner(auth.uid()) AND user_id <> auth.uid());

CREATE POLICY "user_roles_owner_update"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.is_owner(auth.uid()) AND user_id <> auth.uid())
WITH CHECK (public.is_owner(auth.uid()) AND user_id <> auth.uid());

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

CREATE POLICY "payment_settings_read_auth"
ON public.payment_settings FOR SELECT TO authenticated USING (true);
-- writes locked to service role / server functions

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
CREATE POLICY "ps_select_own_or_staff"
ON public.payment_submissions FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_owner(auth.uid())
);

-- Users can create their own submissions only, always in 'pending' status
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

CREATE TYPE public.ticket_status AS ENUM ('open','in_progress','waiting_user','resolved','closed');

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL CHECK (category IN ('account','billing','payment','technical','feedback','other')),
  status public.ticket_status NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_tickets_user_idx ON public.support_tickets(user_id, created_at DESC);
CREATE INDEX support_tickets_status_idx ON public.support_tickets(status, last_activity_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tickets select" ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));
CREATE POLICY "own tickets insert" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff tickets update" ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE TABLE public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_role text NOT NULL CHECK (author_role IN ('user','staff')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_ticket_messages_ticket_idx ON public.support_ticket_messages(ticket_id, created_at);
GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ticket messages select" ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND (
        t.user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')
      ))
  );
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
CREATE POLICY "Owners can read webhook events" ON public.webhook_events
  FOR SELECT TO authenticated USING (public.is_owner(auth.uid()));

-- =====================================================================
-- 20260624144729_c9194d9f-b486-4272-807a-8374cad51cb1.sql
-- =====================================================================
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

-- =====================================================================
-- 20260628120000_feature_requests.sql
-- =====================================================================
-- Feature requests / feedback board.
-- Users submit ideas, vote (one per user), and comment. Staff (admin/owner)
-- moderate status. vote_count is kept in sync by a trigger so the board can be
-- ordered by popularity cheaply.

CREATE TYPE public.feature_status AS ENUM ('open', 'planned', 'in_progress', 'completed', 'rejected');
CREATE TYPE public.feature_category AS ENUM ('feature', 'improvement', 'bug');

CREATE TABLE public.feature_requests (
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

CREATE TABLE public.feature_request_votes (
  feature_request_id uuid NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (feature_request_id, user_id)
);

CREATE TABLE public.feature_request_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id uuid NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feature_requests_status ON public.feature_requests (status);
CREATE INDEX idx_feature_requests_votes ON public.feature_requests (vote_count DESC);
CREATE INDEX idx_feature_comments_req ON public.feature_request_comments (feature_request_id, created_at);

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

CREATE TRIGGER trg_feature_vote_count
  AFTER INSERT OR DELETE ON public.feature_request_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_feature_vote_count();

CREATE TRIGGER trg_feature_requests_updated
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_comments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.feature_requests TO authenticated;
GRANT ALL ON public.feature_requests TO service_role;
CREATE POLICY "fr read all" ON public.feature_requests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "fr insert self" ON public.feature_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "fr update staff" ON public.feature_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
CREATE POLICY "fr delete owner or staff" ON public.feature_requests
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.feature_request_votes TO authenticated;
GRANT ALL ON public.feature_request_votes TO service_role;
CREATE POLICY "frv read all" ON public.feature_request_votes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "frv insert self" ON public.feature_request_votes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "frv delete self" ON public.feature_request_votes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.feature_request_comments TO authenticated;
GRANT ALL ON public.feature_request_comments TO service_role;
CREATE POLICY "frc read all" ON public.feature_request_comments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "frc insert self" ON public.feature_request_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "frc delete self or staff" ON public.feature_request_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));


-- =====================================================================
-- 20260629120000_blog.sql
-- =====================================================================
-- Blog / content system. Staff author posts in the admin; published posts are
-- public. Body is Markdown, rendered safely on the client (see src/lib/markdown).

CREATE TYPE public.blog_status AS ENUM ('draft', 'published');

CREATE TABLE public.blog_posts (
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

CREATE INDEX idx_blog_posts_published ON public.blog_posts (status, published_at DESC);

CREATE TRIGGER trg_blog_posts_updated
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

-- Anyone may read published posts; staff additionally see drafts.
CREATE POLICY "blog anon read published" ON public.blog_posts
  FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "blog authed read" ON public.blog_posts
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_owner(auth.uid())
  );

-- Only staff may write.
CREATE POLICY "blog staff insert" ON public.blog_posts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
CREATE POLICY "blog staff update" ON public.blog_posts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
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

CREATE TABLE public.media_assets (
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

CREATE INDEX idx_media_assets_created ON public.media_assets (created_at DESC);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.media_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;

CREATE POLICY "media_assets read" ON public.media_assets FOR SELECT USING (true);
CREATE POLICY "media_assets staff insert" ON public.media_assets
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
CREATE POLICY "media_assets staff update" ON public.media_assets
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
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

-- =====================================================================
-- 20260702160000_workout_set_logs.sql
-- =====================================================================

-- Real workout tracking: per-set weight/reps, not just a session summary.
-- Personal records are computed on read (MAX weight_kg per exercise per
-- user) rather than cached, so they're always correct with no trigger to
-- maintain.
--
-- This table postdates the RESET block at the top of full_schema.sql, so
-- drop it explicitly here to keep this migration safely re-runnable on its
-- own (matching every other migration's paste-and-run guarantee).
DROP TABLE IF EXISTS public.workout_set_logs CASCADE;

CREATE TABLE public.workout_set_logs (
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
CREATE INDEX workout_set_logs_user_exercise_idx
  ON public.workout_set_logs (user_id, exercise_name, created_at DESC);
CREATE INDEX workout_set_logs_session_idx ON public.workout_set_logs (session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_set_logs TO authenticated;
GRANT ALL ON public.workout_set_logs TO service_role;
ALTER TABLE public.workout_set_logs ENABLE ROW LEVEL SECURITY;
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

-- This table postdates the RESET block at the top of full_schema.sql, so
-- drop it explicitly here to keep this migration safely re-runnable on its
-- own (matching every other migration's paste-and-run guarantee).
DROP TABLE IF EXISTS public.progress_photos CASCADE;

CREATE TABLE public.progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Storage object path (bucket is private), not a public URL — signed URLs
  -- are generated on read, scoped to the owner by RLS.
  image_path text NOT NULL,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX progress_photos_user_date_idx
  ON public.progress_photos (user_id, recorded_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_photos TO authenticated;
GRANT ALL ON public.progress_photos TO service_role;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
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
