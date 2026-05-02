CREATE OR REPLACE FUNCTION public.game_entries_standings(p_game_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  team_name text,
  total_points integer,
  display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.user_id,
    e.team_name,
    e.total_points,
    COALESCE(p.display_name, 'Onbekend') AS display_name
  FROM public.entries e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE auth.uid() IS NOT NULL
    AND e.game_id = p_game_id
    AND e.status = 'submitted'
  ORDER BY e.total_points DESC, COALESCE(p.display_name, e.team_name, '') ASC;
$$;

CREATE OR REPLACE FUNCTION public.subpoule_entries_detail(p_subpoule_id uuid, p_game_id uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  entry_id uuid,
  team_name text,
  total_points integer,
  picks jsonb,
  jokers jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.user_id,
    COALESCE(p.display_name, 'Onbekend') AS display_name,
    e.id AS entry_id,
    e.team_name,
    COALESCE(e.total_points, 0) AS total_points,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('category_id', ep.category_id, 'rider_id', ep.rider_id) ORDER BY ep.category_id::text, ep.created_at)
        FROM public.entry_picks ep
        WHERE ep.entry_id = e.id
      ),
      '[]'::jsonb
    ) AS picks,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('rider_id', ej.rider_id) ORDER BY ej.created_at)
        FROM public.entry_jokers ej
        WHERE ej.entry_id = e.id
      ),
      '[]'::jsonb
    ) AS jokers
  FROM public.subpoule_members m
  JOIN public.subpoules s ON s.id = m.subpoule_id
  LEFT JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN public.entries e
    ON e.user_id = m.user_id
   AND e.game_id = p_game_id
   AND e.status = 'submitted'
  WHERE m.subpoule_id = p_subpoule_id
    AND s.game_id = p_game_id
    AND (
      public.is_admin()
      OR s.owner_user_id = auth.uid()
      OR public.is_subpoule_member(p_subpoule_id, auth.uid())
    )
  ORDER BY COALESCE(e.total_points, 0) DESC, COALESCE(p.display_name, '') ASC;
$$;