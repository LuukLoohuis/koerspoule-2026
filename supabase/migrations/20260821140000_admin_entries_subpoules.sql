-- Subpoules bij de inzendingen in het beheerscherm.
--
-- Zoeken op mailadres of ploegnaam gaf wel de inzending, maar niet in welke
-- subpoule iemand zit -- terwijl dat juist de vraag is bij "waar hoort deze
-- deelnemer bij?".
--
-- Een array en geen samengevoegde tekst: iemand kan in meerdere subpoules van
-- dezelfde game zitten, en de frontend toont ze als losse labels.
--
-- Alleen subpoules van DEZELFDE game als de inzending: een deelnemer die vorig
-- jaar in een Giro-poule zat hoort hier niet in beeld te komen.

DROP FUNCTION IF EXISTS public.admin_entries_overview();

CREATE FUNCTION public.admin_entries_overview()
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
  jokers_count bigint,
  subpoules text[]
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
    (SELECT count(*) FROM public.entry_jokers ej WHERE ej.entry_id = e.id) AS jokers_count,
    COALESCE(
      (
        SELECT array_agg(sp.name ORDER BY sp.name)
        FROM public.subpoule_members sm
        JOIN public.subpoules sp ON sp.id = sm.subpoule_id
        WHERE sm.user_id = e.user_id
          AND sp.game_id = e.game_id
      ),
      ARRAY[]::text[]
    ) AS subpoules
  FROM public.entries e
  JOIN auth.users u ON u.id = e.user_id
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.admin_entries_overview() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_entries_overview() TO authenticated;

-- Rollback: draai 20260502102437 opnieuw; die zet de versie zonder subpoules terug.
