CREATE OR REPLACE FUNCTION public.rider_stage_points(
  p_game_id uuid,
  p_rider_id uuid,
  p_entry_id uuid DEFAULT NULL
)
RETURNS TABLE (
  stage_id uuid,
  stage_number int,
  stage_name text,
  stage_type text,
  finish_position int,
  base_points int,
  multiplier int,
  total_points int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH cfg AS (
    SELECT COALESCE(g.joker_multiplier, 2) AS mult
    FROM public.games g
    WHERE g.id = p_game_id
  ),
  joker AS (
    SELECT EXISTS (
      SELECT 1 FROM public.entry_jokers ej
      WHERE ej.entry_id = p_entry_id
        AND ej.rider_id = p_rider_id
    ) AS is_joker
  )
  SELECT
    s.id AS stage_id,
    s.stage_number,
    s.name AS stage_name,
    s.stage_type,
    sr.finish_position,
    COALESCE(ps.points, 0) AS base_points,
    CASE
      WHEN p_entry_id IS NOT NULL AND (SELECT is_joker FROM joker)
        THEN (SELECT mult FROM cfg)
      ELSE 1
    END AS multiplier,
    (
      COALESCE(ps.points, 0)
      * CASE
          WHEN p_entry_id IS NOT NULL AND (SELECT is_joker FROM joker)
            THEN (SELECT mult FROM cfg)
          ELSE 1
        END
    )::int AS total_points
  FROM public.stages s
  LEFT JOIN public.stage_results sr
    ON sr.stage_id = s.id
   AND sr.rider_id = p_rider_id
   AND COALESCE(sr.did_finish, true) = true
   AND sr.finish_position BETWEEN 1 AND 20
  LEFT JOIN public.points_schema ps
    ON ps.game_id = p_game_id
   AND ps.classification = 'stage'
   AND ps.position = sr.finish_position
  WHERE s.game_id = p_game_id
    AND s.results_status = 'approved'
    AND COALESCE(s.is_gc, false) = false
  ORDER BY s.stage_number;
$$;

REVOKE ALL ON FUNCTION public.rider_stage_points(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rider_stage_points(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rider_stage_points(uuid, uuid, uuid) TO anon;

CREATE INDEX IF NOT EXISTS stage_results_rider_idx
  ON public.stage_results(rider_id);
CREATE INDEX IF NOT EXISTS stage_results_game_rider_idx
  ON public.stage_results(game_id, rider_id);