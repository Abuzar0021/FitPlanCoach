
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
