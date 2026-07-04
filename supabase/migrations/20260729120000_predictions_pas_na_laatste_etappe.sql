-- GC-/trui-voorspelpunten mogen PAS worden toegekend na de laatste etappe (de
-- eind-GC), niet al na rit 1. calculate_prediction_points had een fallback die,
-- zolang de laatste etappe nog niet gefiatteerd was, terugviel op de laatst
-- gefiatteerde etappe en de GC-voorspelling op die TUSSENSTAND scoorde. Daardoor
-- kreeg een deelnemer al na rit 1 zijn eindklassement-bonus. Die fallback is nu
-- verwijderd: is de laatste etappe (hoogste stage_number) nog niet gefiatteerd,
-- dan worden geen voorspelpunten toegekend (rijen blijven leeg door de DELETE
-- bovenaan → totaal = enkel etappepunten tot de eind-GC). Idempotent.

CREATE OR REPLACE FUNCTION public.calculate_prediction_points(p_game_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last_stage uuid;
  v_final_stage_number integer;
  v_gc_winner uuid;
  v_gc_2 uuid;
  v_gc_3 uuid;
  v_points_winner uuid;
  v_kom_winner uuid;
  v_youth_winner uuid;
  v_pts_gc_exact  integer;
  v_pts_gc_podium integer;
  v_pts_jersey    integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT COALESCE((SELECT points FROM public.points_schema
                   WHERE game_id = p_game_id AND classification = 'pred_gc_exact'  AND position = 1), 50) INTO v_pts_gc_exact;
  SELECT COALESCE((SELECT points FROM public.points_schema
                   WHERE game_id = p_game_id AND classification = 'pred_gc_podium' AND position = 1), 25) INTO v_pts_gc_podium;
  SELECT COALESCE((SELECT points FROM public.points_schema
                   WHERE game_id = p_game_id AND classification = 'pred_jersey'    AND position = 1), 25) INTO v_pts_jersey;

  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  SELECT max(stage_number) INTO v_final_stage_number
  FROM public.stages
  WHERE game_id = p_game_id;

  -- Alleen de LAATSTE etappe (eind-GC). GEEN fallback naar een tussenstand:
  -- zolang de laatste etappe niet gefiatteerd is, worden er geen voorspelpunten
  -- toegekend.
  SELECT id INTO v_last_stage
  FROM public.stages
  WHERE game_id = p_game_id
    AND stage_number = v_final_stage_number
    AND results_status = 'approved'
    AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = stages.id)
  LIMIT 1;

  IF v_last_stage IS NULL THEN
    RETURN;
  END IF;

  SELECT rider_id INTO v_gc_winner    FROM public.stage_results WHERE stage_id = v_last_stage AND gc_position = 1 LIMIT 1;
  SELECT rider_id INTO v_gc_2         FROM public.stage_results WHERE stage_id = v_last_stage AND gc_position = 2 LIMIT 1;
  SELECT rider_id INTO v_gc_3         FROM public.stage_results WHERE stage_id = v_last_stage AND gc_position = 3 LIMIT 1;
  SELECT rider_id INTO v_points_winner FROM public.stage_results WHERE stage_id = v_last_stage AND points_position = 1 LIMIT 1;
  SELECT rider_id INTO v_kom_winner   FROM public.stage_results WHERE stage_id = v_last_stage AND mountain_position = 1 LIMIT 1;
  SELECT rider_id INTO v_youth_winner FROM public.stage_results WHERE stage_id = v_last_stage AND youth_position = 1 LIMIT 1;

  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT
    p.entry_id,
    'gc',
    p.position,
    CASE
      WHEN p.position = 1 AND p.rider_id = v_gc_winner THEN v_pts_gc_exact
      WHEN p.position = 2 AND p.rider_id = v_gc_2      THEN v_pts_gc_exact
      WHEN p.position = 3 AND p.rider_id = v_gc_3      THEN v_pts_gc_exact
      WHEN p.rider_id IN (v_gc_winner, v_gc_2, v_gc_3)
       AND p.rider_id IS NOT NULL
       AND NOT (
         (p.position = 1 AND p.rider_id = v_gc_winner) OR
         (p.position = 2 AND p.rider_id = v_gc_2)      OR
         (p.position = 3 AND p.rider_id = v_gc_3)
       )
      THEN v_pts_gc_podium
      ELSE 0
    END AS points
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  WHERE p.classification = 'gc' AND p.position BETWEEN 1 AND 3;

  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT
    p.entry_id,
    p.classification,
    1,
    CASE
      WHEN p.classification = 'points' AND p.rider_id = v_points_winner THEN v_pts_jersey
      WHEN p.classification = 'kom'    AND p.rider_id = v_kom_winner    THEN v_pts_jersey
      WHEN p.classification = 'youth'  AND p.rider_id = v_youth_winner  THEN v_pts_jersey
      ELSE 0
    END
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  WHERE p.classification IN ('points','kom','youth')
    AND p.position = 1;
END $function$;
