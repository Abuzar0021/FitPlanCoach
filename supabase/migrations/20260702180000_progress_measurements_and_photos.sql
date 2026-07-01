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
