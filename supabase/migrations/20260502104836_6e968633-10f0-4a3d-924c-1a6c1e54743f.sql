
-- =========================================================
-- 1. Nieuwe tabel: entry_prediction_points
-- =========================================================
CREATE TABLE IF NOT EXISTS public.entry_prediction_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  classification text NOT NULL,
  position int NOT NULL,
  points int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, classification, position)
);

CREATE INDEX IF NOT EXISTS entry_prediction_points_entry_idx
  ON public.entry_prediction_points(entry_id);

ALTER TABLE public.entry_prediction_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entry_prediction_points_select ON public.entry_prediction_points;
CREATE POLICY entry_prediction_points_select
  ON public.entry_prediction_points
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.entries e
      WHERE e.id = entry_prediction_points.entry_id
        AND (e.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS entry_prediction_points_admin_write ON public.entry_prediction_points;
CREATE POLICY entry_prediction_points_admin_write
  ON public.entry_prediction_points
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =========================================================
-- 2. seed_default_points_schema — nieuwe etappepunten top 20
-- =========================================================
CREATE OR REPLACE FUNCTION public.seed_default_points_schema(p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage int[] := ARRAY[50,40,32,26,22,20,18,16,14,12,10,9,8,7,6,5,4,3,2,1];
  v_pos int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- alle bestaande regels weg (oude jersey/gc-rijen vervallen)
  DELETE FROM public.points_schema WHERE game_id = p_game_id;

  FOR v_pos IN 1..array_length(v_stage,1) LOOP
    INSERT INTO public.points_schema(game_id, classification, position, points)
    VALUES (p_game_id, 'stage', v_pos, v_stage[v_pos]);
  END LOOP;
END $$;

-- =========================================================
-- 3. calculate_stage_scores — alleen top 20 finish + joker ×2
-- =========================================================
CREATE OR REPLACE FUNCTION public.calculate_stage_scores(p_stage_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_game uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT game_id INTO v_game FROM public.stages WHERE id = p_stage_id;
  IF v_game IS NULL THEN RAISE EXCEPTION 'Stage not found'; END IF;

  -- idempotent: clean slate
  DELETE FROM public.stage_points WHERE stage_id = p_stage_id;

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
  -- Punten per (entry, rider) = base × (2 als joker, anders 1)
  entry_rider_pts AS (
    SELECT
      ep.entry_id,
      ep.rider_id,
      COALESCE(rp.pts, 0) AS base_pts,
      CASE WHEN ej.rider_id IS NOT NULL THEN 2 ELSE 1 END AS mult
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

    -- jokers die niet ook in picks staan: 2× hun stagepunten
    SELECT
      ej.entry_id,
      ej.rider_id,
      COALESCE(rp.pts, 0) AS base_pts,
      2 AS mult
    FROM public.entry_jokers ej
    JOIN public.entries e
      ON e.id = ej.entry_id
     AND e.game_id = v_game
     AND e.status = 'submitted'
    LEFT JOIN rider_pts rp ON rp.rider_id = ej.rider_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.entry_picks ep2
      WHERE ep2.entry_id = ej.entry_id
        AND ep2.rider_id = ej.rider_id
    )
  )
  INSERT INTO public.stage_points(stage_id, entry_id, points)
  SELECT p_stage_id, entry_id, SUM(base_pts * mult)::int
  FROM entry_rider_pts
  GROUP BY entry_id;
END $$;

-- =========================================================
-- 4. calculate_prediction_points
--    Podium GC: 50 / 25 (max 150) — Truien (points/kom/youth): 25
-- =========================================================
CREATE OR REPLACE FUNCTION public.calculate_prediction_points(p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_stage uuid;
  v_gc_winner uuid;
  v_gc_2 uuid;
  v_gc_3 uuid;
  v_points_winner uuid;
  v_kom_winner uuid;
  v_youth_winner uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- Wis bestaande voorspellings-bonussen voor alle entries van deze game
  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  -- Pak laatste etappe waarvoor resultaten bestaan
  SELECT s.id INTO v_last_stage
  FROM public.stages s
  WHERE s.game_id = p_game_id
    AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = s.id)
  ORDER BY s.stage_number DESC
  LIMIT 1;

  IF v_last_stage IS NULL THEN
    RETURN; -- nog geen uitslagen, niets te scoren
  END IF;

  -- Werkelijke top 3 GC + truien-winnaars
  SELECT rider_id INTO v_gc_winner
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND gc_position = 1 LIMIT 1;
  SELECT rider_id INTO v_gc_2
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND gc_position = 2 LIMIT 1;
  SELECT rider_id INTO v_gc_3
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND gc_position = 3 LIMIT 1;
  SELECT rider_id INTO v_points_winner
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND points_position = 1 LIMIT 1;
  SELECT rider_id INTO v_kom_winner
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND mountain_position = 1 LIMIT 1;
  SELECT rider_id INTO v_youth_winner
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND youth_position = 1 LIMIT 1;

  -- ----------- GC podium per entry (50 / 25 / 0, max 150) -----------
  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT
    p.entry_id,
    'gc',
    p.position,
    CASE
      WHEN p.position = 1 AND p.rider_id = v_gc_winner THEN 50
      WHEN p.position = 2 AND p.rider_id = v_gc_2      THEN 50
      WHEN p.position = 3 AND p.rider_id = v_gc_3      THEN 50
      WHEN p.rider_id IN (v_gc_winner, v_gc_2, v_gc_3)
       AND p.rider_id IS NOT NULL
       AND NOT (
         (p.position = 1 AND p.rider_id = v_gc_winner) OR
         (p.position = 2 AND p.rider_id = v_gc_2)      OR
         (p.position = 3 AND p.rider_id = v_gc_3)
       )
      THEN 25
      ELSE 0
    END AS points
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  WHERE p.classification = 'gc' AND p.position BETWEEN 1 AND 3;

  -- ----------- Truien (winnaar = 25) -----------
  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT
    p.entry_id,
    p.classification,
    1,
    CASE
      WHEN p.classification = 'points' AND p.rider_id = v_points_winner THEN 25
      WHEN p.classification = 'kom'    AND p.rider_id = v_kom_winner    THEN 25
      WHEN p.classification = 'youth'  AND p.rider_id = v_youth_winner  THEN 25
      ELSE 0
    END
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  WHERE p.classification IN ('points','kom','youth')
    AND p.position = 1;
END $$;

-- =========================================================
-- 5. update_total_ranking — telt etappes + voorspellingen
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_total_ranking(p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  INSERT INTO public.total_points(entry_id, total_points, updated_at)
  SELECT
    e.id,
    (
      COALESCE((SELECT SUM(sp.points)
                  FROM public.stage_points sp
                  JOIN public.stages s ON s.id = sp.stage_id
                 WHERE sp.entry_id = e.id AND s.game_id = p_game_id), 0)
      +
      COALESCE((SELECT SUM(epp.points)
                  FROM public.entry_prediction_points epp
                 WHERE epp.entry_id = e.id), 0)
    )::int,
    now()
  FROM public.entries e
  WHERE e.game_id = p_game_id
  ON CONFLICT (entry_id) DO UPDATE
    SET total_points = EXCLUDED.total_points,
        updated_at = now();

  UPDATE public.entries e
  SET total_points = COALESCE(tp.total_points, 0)
  FROM public.total_points tp
  WHERE tp.entry_id = e.id AND e.game_id = p_game_id;
END $$;

-- =========================================================
-- 6. full_recalculation — alles opnieuw, idempotent
-- =========================================================
CREATE OR REPLACE FUNCTION public.full_recalculation(p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_stage uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  DELETE FROM public.stage_points
  WHERE stage_id IN (SELECT id FROM public.stages WHERE game_id = p_game_id);

  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  FOR v_stage IN SELECT id FROM public.stages WHERE game_id = p_game_id LOOP
    PERFORM public.calculate_stage_scores(v_stage);
  END LOOP;

  PERFORM public.calculate_prediction_points(p_game_id);
  PERFORM public.update_total_ranking(p_game_id);
END $$;

-- =========================================================
-- 7. Grants
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.calculate_prediction_points(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.calculate_prediction_points(uuid) TO authenticated;

-- =========================================================
-- 8. Bestaande puntentabel voor alle bestaande games vervangen
--    door de nieuwe top-20 etappepunten (oude trui/gc-rijen weg)
-- =========================================================
DO $$
DECLARE g_id uuid;
BEGIN
  FOR g_id IN SELECT id FROM public.games LOOP
    DELETE FROM public.points_schema WHERE game_id = g_id;
    INSERT INTO public.points_schema(game_id, classification, position, points)
    SELECT g_id, 'stage', pos, pts
    FROM (VALUES
      (1,50),(2,40),(3,32),(4,26),(5,22),
      (6,20),(7,18),(8,16),(9,14),(10,12),
      (11,10),(12,9),(13,8),(14,7),(15,6),
      (16,5),(17,4),(18,3),(19,2),(20,1)
    ) AS v(pos,pts);
  END LOOP;
END $$;
