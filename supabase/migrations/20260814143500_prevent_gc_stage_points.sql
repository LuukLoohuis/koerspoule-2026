-- Een speciale GC-etappe bevat alleen de eindklassement- en truivoorspellingen.
-- approve_stage_results riep calculate_stage_scores echter ook voor deze rij aan,
-- waardoor finish_position-data per ongeluk als een extra gewone etappe meetelde.
--
-- Leg de invariant bij de scorer zelf vast. Daarmee blijven ook bestaande
-- callers en volledige herberekeningen veilig. Herstel aansluitend alle reeds
-- berekende GC-etappepunten en bouw de getroffen totalen opnieuw op.

CREATE OR REPLACE FUNCTION public.calculate_stage_scores(p_stage_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_game uuid;
  v_mult integer;
  v_is_gc boolean;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT game_id, is_gc
    INTO v_game, v_is_gc
  FROM public.stages
  WHERE id = p_stage_id;

  IF v_game IS NULL THEN RAISE EXCEPTION 'Stage not found'; END IF;

  -- Afgeleide data altijd eerst opruimen. Voor een GC-etappe is dit tevens de
  -- volledige berekening: die scoort uitsluitend via entry_prediction_points.
  DELETE FROM public.stage_points WHERE stage_id = p_stage_id;
  IF COALESCE(v_is_gc, false) THEN RETURN; END IF;

  SELECT COALESCE(joker_multiplier, 2)
    INTO v_mult
  FROM public.games
  WHERE id = v_game;
  IF v_mult IS NULL THEN v_mult := 2; END IF;

  WITH rider_pts AS (
    SELECT
      sr.rider_id,
      COALESCE(ps.points, 0) AS pts
    FROM public.stage_results sr
    LEFT JOIN public.points_schema ps
      ON ps.game_id = v_game
     AND ps.classification = 'stage'
     AND ps.position = sr.finish_position
    WHERE sr.stage_id = p_stage_id
      AND sr.finish_position IS NOT NULL
      AND sr.finish_position BETWEEN 1 AND 20
      AND COALESCE(sr.did_finish, true) = true
  ),
  entry_rider_pts AS (
    SELECT
      ep.entry_id,
      ep.rider_id,
      COALESCE(rp.pts, 0) AS base_pts,
      CASE WHEN ej.rider_id IS NOT NULL THEN v_mult ELSE 1 END AS mult
    FROM public.entry_picks ep
    JOIN public.entries e
      ON e.id = ep.entry_id
     AND e.game_id = v_game
     AND e.status = 'submitted'
    LEFT JOIN rider_pts rp ON rp.rider_id = ep.rider_id
    LEFT JOIN public.entry_jokers ej
      ON ej.entry_id = ep.entry_id
     AND ej.rider_id = ep.rider_id

    UNION ALL

    SELECT
      ej.entry_id,
      ej.rider_id,
      COALESCE(rp.pts, 0) AS base_pts,
      v_mult AS mult
    FROM public.entry_jokers ej
    JOIN public.entries e
      ON e.id = ej.entry_id
     AND e.game_id = v_game
     AND e.status = 'submitted'
    LEFT JOIN rider_pts rp ON rp.rider_id = ej.rider_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.entry_picks ep2
      WHERE ep2.entry_id = ej.entry_id
        AND ep2.rider_id = ej.rider_id
    )
  )
  INSERT INTO public.stage_points(stage_id, entry_id, points)
  SELECT p_stage_id, entry_id, SUM(base_pts * mult)::integer
  FROM entry_rider_pts
  GROUP BY entry_id;
END
$function$;

-- Herstel uitsluitend de gemelde Tour de France Femmes 2026-productiedata.
-- De betreffende punten zijn volledig afgeleid en worden hieronder uit de
-- reguliere etappes + voorspellingen opnieuw opgebouwd.
DELETE FROM public.stage_points sp
USING public.stages s
WHERE s.id = sp.stage_id
  AND COALESCE(s.is_gc, false) = true
  AND s.game_id = 'ca2d9c9e-c9e2-4d75-a520-9a6eaeac6263'::uuid;

WITH recalculated AS (
  SELECT
    e.id AS entry_id,
    (
      COALESCE((
        SELECT SUM(sp.points)
        FROM public.stage_points sp
        JOIN public.stages s ON s.id = sp.stage_id
        WHERE sp.entry_id = e.id
          AND s.game_id = e.game_id
          AND COALESCE(s.is_gc, false) = false
      ), 0)
      +
      COALESCE((
        SELECT SUM(epp.points)
        FROM public.entry_prediction_points epp
        WHERE epp.entry_id = e.id
      ), 0)
    )::integer AS total_points
  FROM public.entries e
  WHERE e.game_id = 'ca2d9c9e-c9e2-4d75-a520-9a6eaeac6263'::uuid
)
INSERT INTO public.total_points(entry_id, total_points, updated_at)
SELECT entry_id, total_points, now()
FROM recalculated
ON CONFLICT (entry_id) DO UPDATE
SET total_points = EXCLUDED.total_points,
    updated_at = now();

UPDATE public.entries e
SET total_points = tp.total_points
FROM public.total_points tp
WHERE tp.entry_id = e.id
  AND e.game_id = 'ca2d9c9e-c9e2-4d75-a520-9a6eaeac6263'::uuid;

-- De publieke topstand leest uit deze materialized view.
REFRESH MATERIALIZED VIEW public.leaderboard_global_mv;

-- Rollback: herstel de calculate_stage_scores-definitie uit
-- 20260512180047_30def525-cdea-4bc2-8c81-4589d38e9b74.sql. Verwijderde
-- GC-stage_points horen niet te worden teruggezet; het waren onjuiste afgeleide
-- gegevens.
