
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
