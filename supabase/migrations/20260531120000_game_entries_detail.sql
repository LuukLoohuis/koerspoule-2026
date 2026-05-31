-- game_entries_detail: zoals subpoule_entries_detail, maar voor ALLE ingediende
-- teams in een game. Nodig voor de game-brede benchmark (Hors Categorie ->
-- Benchmark), waar je je team + jokers + voorspellingen met elke andere
-- deelnemer kunt vergelijken. SECURITY DEFINER omdat entries/picks/jokers/
-- predictions per RLS alleen door de eigenaar leesbaar zijn; deze read is pas
-- zinvol nadat de inschrijving gesloten is (benchmark is in de UI gated).

DROP FUNCTION IF EXISTS public.game_entries_detail(uuid);

CREATE OR REPLACE FUNCTION public.game_entries_detail(p_game_id uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  entry_id uuid,
  team_name text,
  total_points integer,
  picks jsonb,
  jokers jsonb,
  predictions jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.user_id,
    COALESCE(p.display_name, 'Onbekend') AS display_name,
    e.id AS entry_id,
    e.team_name,
    COALESCE(e.total_points, 0) AS total_points,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('category_id', ep.category_id, 'rider_id', ep.rider_id) ORDER BY ep.category_id::text, ep.created_at)
       FROM public.entry_picks ep WHERE ep.entry_id = e.id),
      '[]'::jsonb
    ) AS picks,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('rider_id', ej.rider_id) ORDER BY ej.created_at)
       FROM public.entry_jokers ej WHERE ej.entry_id = e.id),
      '[]'::jsonb
    ) AS jokers,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('classification', epr.classification, 'position', epr.position, 'rider_id', epr.rider_id) ORDER BY epr.classification, epr.position)
       FROM public.entry_predictions epr WHERE epr.entry_id = e.id),
      '[]'::jsonb
    ) AS predictions
  FROM public.entries e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE e.game_id = p_game_id
    AND e.status = 'submitted'
  ORDER BY COALESCE(e.total_points, 0) DESC, COALESCE(p.display_name, '') ASC;
$$;

REVOKE ALL ON FUNCTION public.game_entries_detail(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.game_entries_detail(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.game_entries_detail(uuid) TO authenticated;
