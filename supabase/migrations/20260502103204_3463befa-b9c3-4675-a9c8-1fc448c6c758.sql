DROP VIEW IF EXISTS public.admin_user_overview;

CREATE OR REPLACE FUNCTION public.admin_user_overview()
RETURNS TABLE (
  user_id uuid,
  email text,
  created_at timestamptz,
  is_admin boolean,
  teams_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    u.created_at,
    COALESCE(p.is_admin, false) AS is_admin,
    (SELECT count(*) FROM public.entries e WHERE e.user_id = u.id) AS teams_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.admin_user_overview() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_user_overview() TO authenticated;

CREATE VIEW public.admin_user_overview
WITH (security_invoker = on) AS
SELECT * FROM public.admin_user_overview();

GRANT SELECT ON public.admin_user_overview TO authenticated;

NOTIFY pgrst, 'reload schema';