-- Fix admin_entries_overview: remove auth.users dependency for client access
-- Recreate view to run with definer rights so it can read auth.users,
-- and restrict via underlying RLS check using is_admin() in a wrapper.

DROP VIEW IF EXISTS public.admin_entries_overview;

CREATE OR REPLACE FUNCTION public.admin_entries_overview()
RETURNS TABLE (
  entry_id uuid,
  game_id uuid,
  user_id uuid,
  team_name text,
  entry_status text,
  submitted_at timestamptz,
  created_at timestamptz,
  total_points int,
  email text,
  display_name text,
  picks_count bigint,
  jokers_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    e.id AS entry_id,
    e.game_id,
    e.user_id,
    e.team_name,
    e.status AS entry_status,
    e.submitted_at,
    e.created_at,
    e.total_points,
    u.email::text AS email,
    COALESCE(p.display_name, u.email::text) AS display_name,
    (SELECT count(*) FROM public.entry_picks ep WHERE ep.entry_id = e.id) AS picks_count,
    (SELECT count(*) FROM public.entry_jokers ej WHERE ej.entry_id = e.id) AS jokers_count
  FROM public.entries e
  JOIN auth.users u ON u.id = e.user_id
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.admin_entries_overview() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_entries_overview() TO authenticated;

-- Recreate the view name as a thin wrapper around the function so the existing
-- client query (`from('admin_entries_overview').select('*').eq('game_id', ...)`)
-- keeps working without code changes.
CREATE VIEW public.admin_entries_overview
WITH (security_invoker = on) AS
SELECT * FROM public.admin_entries_overview();

GRANT SELECT ON public.admin_entries_overview TO authenticated;

NOTIFY pgrst, 'reload schema';