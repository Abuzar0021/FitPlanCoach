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
CREATE TABLE public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description text CHECK (description IS NULL OR char_length(description) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.blog_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.blog_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  bio text CHECK (bio IS NULL OR char_length(bio) <= 600),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.blog_post_tags (
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
CREATE INDEX idx_blog_post_tags_tag ON public.blog_post_tags (tag_id);

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

CREATE INDEX idx_blog_posts_category ON public.blog_posts (category_id);
CREATE INDEX idx_blog_posts_author_ref ON public.blog_posts (author_ref_id);
CREATE INDEX idx_blog_posts_scheduled ON public.blog_posts (status, scheduled_at) WHERE status = 'scheduled';

-- 4. RLS — identical staff-write / public-read shape already used by
-- blog_posts and media_assets.
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.blog_categories, public.blog_tags, public.blog_authors, public.blog_post_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_categories, public.blog_tags, public.blog_authors, public.blog_post_tags TO authenticated;
GRANT ALL ON public.blog_categories, public.blog_tags, public.blog_authors, public.blog_post_tags TO service_role;

CREATE POLICY "blog_categories read" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "blog_categories staff insert" ON public.blog_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
CREATE POLICY "blog_categories staff update" ON public.blog_categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
CREATE POLICY "blog_categories staff delete" ON public.blog_categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));

CREATE POLICY "blog_tags read" ON public.blog_tags FOR SELECT USING (true);
CREATE POLICY "blog_tags staff insert" ON public.blog_tags FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
CREATE POLICY "blog_tags staff update" ON public.blog_tags FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
CREATE POLICY "blog_tags staff delete" ON public.blog_tags FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));

CREATE POLICY "blog_authors read" ON public.blog_authors FOR SELECT USING (true);
CREATE POLICY "blog_authors staff insert" ON public.blog_authors FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
CREATE POLICY "blog_authors staff update" ON public.blog_authors FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
CREATE POLICY "blog_authors staff delete" ON public.blog_authors FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));

CREATE POLICY "blog_post_tags read" ON public.blog_post_tags FOR SELECT USING (true);
CREATE POLICY "blog_post_tags staff insert" ON public.blog_post_tags FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));
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
