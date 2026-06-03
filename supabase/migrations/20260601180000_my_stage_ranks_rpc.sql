-- StageBars: jouw dagklassering per etappe, server-side. Vervangt het ophalen
-- van alle stage_points naar de client. Geeft per etappe (waar jij punten
-- scoorde) jouw rang onder alle ingediende teams. SECURITY DEFINER (leest
-- andermans punten voor de ranking).

DROP FUNCTION IF EXISTS public.my_stage_ranks(uuid, uuid);

CREATE OR REPLACE FUNCTION public.my_stage_ranks(p_game_id uuid, p_user_id uuid)
RETURNS TABLE(stage_id uuid, my_rank integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.stage_id, q.rnk::int AS my_rank
  FROM (
    SELECT sp.stage_id, sp.entry_id,
           RANK() OVER (PARTITION BY sp.stage_id ORDER BY sp.points DESC) AS rnk
    FROM public.stage_points sp
    JOIN public.stages s  ON s.id = sp.stage_id AND s.game_id = p_game_id
    JOIN public.entries e ON e.id = sp.entry_id AND e.status = 'submitted'
    WHERE sp.points > 0
  ) q
  JOIN public.entries me
    ON me.id = q.entry_id
   AND me.game_id = p_game_id
   AND me.user_id = p_user_id
   AND me.status = 'submitted';
$$;

REVOKE ALL ON FUNCTION public.my_stage_ranks(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_stage_ranks(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.my_stage_ranks(uuid, uuid) TO authenticated;
