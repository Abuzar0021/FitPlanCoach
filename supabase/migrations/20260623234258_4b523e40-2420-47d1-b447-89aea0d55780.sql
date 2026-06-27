
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
