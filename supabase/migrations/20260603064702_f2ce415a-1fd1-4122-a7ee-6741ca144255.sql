-- 20260601140000_scaling_indexes.sql
CREATE INDEX IF NOT EXISTS stage_points_entry_idx ON public.stage_points(entry_id);
CREATE INDEX IF NOT EXISTS entry_picks_entry_idx ON public.entry_picks(entry_id);
CREATE INDEX IF NOT EXISTS entry_jokers_entry_idx ON public.entry_jokers(entry_id);
CREATE INDEX IF NOT EXISTS entries_game_status_idx ON public.entries(game_id, status);
CREATE INDEX IF NOT EXISTS category_riders_rider_idx ON public.category_riders(rider_id);

-- 20260601160000_game_standings_rpc.sql
DROP FUNCTION IF EXISTS public.game_standings(uuid, integer);

CREATE OR REPLACE FUNCTION public.game_standings(p_game_id uuid, p_upto integer)
RETURNS TABLE(
  entry_id uuid,
  user_id uuid,
  team_name text,
  display_name text,
  cum_points integer,
  pred_bonus integer,
  total integer,
  rank integer,
  prev_rank integer,
  delta integer,
  stage_points integer,
  stage_rank integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sp AS (
    SELECT sp.entry_id, s.stage_number, sp.points
    FROM public.stage_points sp
    JOIN public.stages s ON s.id = sp.stage_id
    WHERE s.game_id = p_game_id
  ),
  agg AS (
    SELECT
      e.id AS entry_id,
      e.user_id,
      e.team_name,
      COALESCE((SELECT SUM(x.points) FROM sp x WHERE x.entry_id = e.id AND x.stage_number <= p_upto), 0)::int     AS cum_points,
      COALESCE((SELECT SUM(x.points) FROM sp x WHERE x.entry_id = e.id AND x.stage_number <= p_upto - 1), 0)::int AS prev_cum,
      COALESCE((SELECT SUM(x.points) FROM sp x WHERE x.entry_id = e.id AND x.stage_number = p_upto), 0)::int      AS stage_points,
      COALESCE((SELECT SUM(x.points) FROM sp x WHERE x.entry_id = e.id), 0)::int                                  AS full_sum,
      COALESCE(e.total_points, 0)::int AS total_points
    FROM public.entries e
    WHERE e.game_id = p_game_id AND e.status = 'submitted'
  ),
  wb AS (
    SELECT a.*, GREATEST(0, a.total_points - a.full_sum)::int AS pred_bonus
    FROM agg a
  ),
  ranked AS (
    SELECT
      wb.*,
      (wb.cum_points + wb.pred_bonus) AS total_now,
      RANK() OVER (ORDER BY (wb.cum_points + wb.pred_bonus) DESC)  AS rnk,
      RANK() OVER (ORDER BY (wb.prev_cum + wb.pred_bonus) DESC)    AS prev_rnk,
      CASE WHEN wb.stage_points > 0
           THEN RANK() OVER (ORDER BY wb.stage_points DESC)
      END AS st_rank
    FROM wb
  )
  SELECT
    r.entry_id,
    r.user_id,
    r.team_name,
    COALESCE(p.display_name, NULL) AS display_name,
    r.cum_points,
    r.pred_bonus,
    r.total_now::int AS total,
    r.rnk::int AS rank,
    r.prev_rnk::int AS prev_rank,
    (r.prev_rnk - r.rnk)::int AS delta,
    r.stage_points,
    r.st_rank::int AS stage_rank
  FROM ranked r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  ORDER BY r.rnk, COALESCE(r.team_name, '');
$$;

REVOKE ALL ON FUNCTION public.game_standings(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.game_standings(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.game_standings(uuid, integer) TO authenticated;