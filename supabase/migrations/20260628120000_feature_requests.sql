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
