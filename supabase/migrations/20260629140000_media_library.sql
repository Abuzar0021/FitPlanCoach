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
