
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
