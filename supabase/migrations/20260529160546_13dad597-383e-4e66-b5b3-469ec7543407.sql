
-- profiles cleanup
DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_profile_privilege_escalation();

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;

CREATE OR REPLACE FUNCTION public.assign_admin_role(p_user_id uuid, p_make_admin boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_make_admin then
    insert into public.user_roles(user_id, role) values (p_user_id, 'admin') on conflict do nothing;
  else
    delete from public.user_roles where user_id = p_user_id and role = 'admin';
  end if;
end $$;

CREATE OR REPLACE FUNCTION public.admin_user_overview()
RETURNS TABLE(user_id uuid, email text, created_at timestamp with time zone, is_admin boolean, teams_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT u.id, u.email::text, u.created_at,
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin'),
    (SELECT count(*) FROM public.entries e WHERE e.user_id = u.id)
  FROM auth.users u
  WHERE public.is_admin();
$$;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Realtime: restrict broadcast/presence reads
CREATE POLICY "deny_broadcast_presence_reads" ON realtime.messages
  FOR SELECT TO authenticated USING (false);

-- Storage: remove listing for stage-profiles bucket; public URL still works
DROP POLICY IF EXISTS "Stage profiles are publicly accessible" ON storage.objects;
