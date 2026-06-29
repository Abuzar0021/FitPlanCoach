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
