-- Hors Catégorie tijdlijn ("Jij vs de Gemiddelde Aap"): gemiddelde stage-punten
-- per etappe over alle ingediende teams, server-side. Vervangt het ophalen van
-- alle stage_points naar de client (deelnemers × etappes) door één geaggregeerde
-- rij per etappe. SECURITY DEFINER (leest andermans punten voor het gemiddelde).

DROP FUNCTION IF EXISTS public.game_stage_averages(uuid);

CREATE OR REPLACE FUNCTION public.game_stage_averages(p_game_id uuid)
RETURNS TABLE(stage_id uuid, avg_points numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.stage_id, AVG(sp.points)::numeric AS avg_points
  FROM public.stage_points sp
  JOIN public.stages s  ON s.id = sp.stage_id AND s.game_id = p_game_id
  JOIN public.entries e ON e.id = sp.entry_id AND e.status = 'submitted'
  GROUP BY sp.stage_id;
$$;

REVOKE ALL ON FUNCTION public.game_stage_averages(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.game_stage_averages(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.game_stage_averages(uuid) TO authenticated;