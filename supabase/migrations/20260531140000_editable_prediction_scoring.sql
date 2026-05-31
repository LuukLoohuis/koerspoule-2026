-- Maakt de GC-/trui-voorspellingsscores AANPASBAAR per game.
-- De puntwaarden komen uit points_schema (nieuwe classificaties), met de
-- bestaande vaste waarden als fallback:
--   pred_gc_exact   (pos 1) → juiste renner op juiste plek in GC-podium  (default 50)
--   pred_gc_podium  (pos 1) → juiste renner in top 3, verkeerde plek     (default 25)
--   pred_jersey     (pos 1) → juiste winnaar groen/berg/wit (per trui)   (default 25)
--
-- De winnaars worden net als voorheen afgeleid uit de stage_results van de
-- laatste (hoogst genummerde) etappe met goedgekeurde uitslag (de Giro: rit 21,
-- gc_position/points_position/mountain_position/youth_position = 1..3).

-- points_schema.classification mag nu ook de voorspellings-puntwaarden bevatten.
ALTER TABLE public.points_schema DROP CONSTRAINT IF EXISTS points_schema_classification_check;
ALTER TABLE public.points_schema
  ADD CONSTRAINT points_schema_classification_check
  CHECK (classification IN ('stage','gc','kom','points','youth','pred_gc_exact','pred_gc_podium','pred_jersey'));

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
  -- Aanpasbare puntwaarden (uit points_schema, met defaults)
  v_pts_gc_exact  integer;
  v_pts_gc_podium integer;
  v_pts_jersey    integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- Lees de (aanpasbare) puntwaarden; val terug op de standaardwaarden.
  SELECT COALESCE((SELECT points FROM public.points_schema
                   WHERE game_id = p_game_id AND classification = 'pred_gc_exact'  AND position = 1), 50) INTO v_pts_gc_exact;
  SELECT COALESCE((SELECT points FROM public.points_schema
                   WHERE game_id = p_game_id AND classification = 'pred_gc_podium' AND position = 1), 25) INTO v_pts_gc_podium;
  SELECT COALESCE((SELECT points FROM public.points_schema
                   WHERE game_id = p_game_id AND classification = 'pred_jersey'    AND position = 1), 25) INTO v_pts_jersey;

  -- Wis bestaande voorspellingspunten voor deze game
  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  -- Hoogste etappenummer
  SELECT max(stage_number) INTO v_final_stage_number
  FROM public.stages
  WHERE game_id = p_game_id;

  -- Laatste etappe met goedgekeurde uitslag + bestaande stage_results
  SELECT id INTO v_last_stage
  FROM public.stages
  WHERE game_id = p_game_id
    AND stage_number = v_final_stage_number
    AND results_status = 'approved'
    AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = stages.id)
  LIMIT 1;

  -- Niet gevonden? Probeer de hoogst genummerde etappe die wél een goedgekeurde
  -- uitslag heeft (bv. als de allerlaatste etappe een GC-displayrit zonder
  -- uitslag is).
  IF v_last_stage IS NULL THEN
    SELECT s.id INTO v_last_stage
    FROM public.stages s
    WHERE s.game_id = p_game_id
      AND s.results_status = 'approved'
      AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = s.id)
    ORDER BY s.stage_number DESC
    LIMIT 1;
  END IF;

  IF v_last_stage IS NULL THEN
    RETURN;  -- Nog geen goedgekeurde uitslag, niets te scoren
  END IF;

  -- Werkelijke winnaars uit de stage_results van de laatste etappe
  SELECT rider_id INTO v_gc_winner    FROM public.stage_results WHERE stage_id = v_last_stage AND gc_position = 1 LIMIT 1;
  SELECT rider_id INTO v_gc_2         FROM public.stage_results WHERE stage_id = v_last_stage AND gc_position = 2 LIMIT 1;
  SELECT rider_id INTO v_gc_3         FROM public.stage_results WHERE stage_id = v_last_stage AND gc_position = 3 LIMIT 1;
  SELECT rider_id INTO v_points_winner FROM public.stage_results WHERE stage_id = v_last_stage AND points_position = 1 LIMIT 1;
  SELECT rider_id INTO v_kom_winner   FROM public.stage_results WHERE stage_id = v_last_stage AND mountain_position = 1 LIMIT 1;
  SELECT rider_id INTO v_youth_winner FROM public.stage_results WHERE stage_id = v_last_stage AND youth_position = 1 LIMIT 1;

  -- ===== GC-PODIUM =====
  -- Juiste plek: v_pts_gc_exact · juiste renner verkeerde plek: v_pts_gc_podium · anders 0.
  -- Elke positie apart; een renner kan max één keer scoren (positie-gebaseerd).
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

  -- ===== TRUIEN (groen/berg/wit) =====
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
