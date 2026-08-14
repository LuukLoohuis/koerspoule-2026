-- Maak de eindklassementflow atomair: concept-GC klaarzetten berekent direct
-- de voorspellingsbonussen en zet de uitslag pending. Daardoor hoeft de GC niet
-- langer al goedgekeurd te zijn voordat hij voor fiat kan worden voorbereid.
--
-- Compatibiliteit:
-- - gewone etappes behouden hun bestaande calculation_status-gate;
-- - calculate_prediction_points accepteert alleen de LAATSTE GC-etappe en
--   uitsluitend pending/approved, dus nooit een willekeurige tussenstand;
-- - bestaande clients kunnen submit_stage_for_approval ongewijzigd aanroepen.

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
  v_pts_gc_exact integer;
  v_pts_gc_podium integer;
  v_pts_jersey integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT COALESCE((SELECT points FROM public.points_schema
                   WHERE game_id = p_game_id AND classification = 'pred_gc_exact' AND position = 1), 50)
    INTO v_pts_gc_exact;
  SELECT COALESCE((SELECT points FROM public.points_schema
                   WHERE game_id = p_game_id AND classification = 'pred_gc_podium' AND position = 1), 25)
    INTO v_pts_gc_podium;
  SELECT COALESCE((SELECT points FROM public.points_schema
                   WHERE game_id = p_game_id AND classification = 'pred_jersey' AND position = 1), 25)
    INTO v_pts_jersey;

  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  SELECT max(stage_number) INTO v_final_stage_number
  FROM public.stages
  WHERE game_id = p_game_id;

  -- Alleen de speciale eind-GC mag voorspellingen scoren. Pending is nodig om
  -- de bonus vóór de definitieve fiat te kunnen controleren; approved blijft
  -- ondersteund voor herberekeningen en bestaande callers.
  SELECT id INTO v_last_stage
  FROM public.stages
  WHERE game_id = p_game_id
    AND stage_number = v_final_stage_number
    AND is_gc = true
    AND results_status IN ('pending', 'approved')
    AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = stages.id)
  LIMIT 1;

  IF v_last_stage IS NULL THEN RETURN; END IF;

  SELECT rider_id INTO v_gc_winner FROM public.stage_results WHERE stage_id = v_last_stage AND gc_position = 1 LIMIT 1;
  SELECT rider_id INTO v_gc_2 FROM public.stage_results WHERE stage_id = v_last_stage AND gc_position = 2 LIMIT 1;
  SELECT rider_id INTO v_gc_3 FROM public.stage_results WHERE stage_id = v_last_stage AND gc_position = 3 LIMIT 1;
  SELECT rider_id INTO v_points_winner FROM public.stage_results WHERE stage_id = v_last_stage AND points_position = 1 LIMIT 1;
  SELECT rider_id INTO v_kom_winner FROM public.stage_results WHERE stage_id = v_last_stage AND mountain_position = 1 LIMIT 1;
  SELECT rider_id INTO v_youth_winner FROM public.stage_results WHERE stage_id = v_last_stage AND youth_position = 1 LIMIT 1;

  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT p.entry_id, 'gc', p.position,
    CASE
      WHEN p.position = 1 AND p.rider_id = v_gc_winner THEN v_pts_gc_exact
      WHEN p.position = 2 AND p.rider_id = v_gc_2 THEN v_pts_gc_exact
      WHEN p.position = 3 AND p.rider_id = v_gc_3 THEN v_pts_gc_exact
      WHEN p.rider_id IN (v_gc_winner, v_gc_2, v_gc_3)
       AND p.rider_id IS NOT NULL
       AND NOT (
         (p.position = 1 AND p.rider_id = v_gc_winner) OR
         (p.position = 2 AND p.rider_id = v_gc_2) OR
         (p.position = 3 AND p.rider_id = v_gc_3)
       ) THEN v_pts_gc_podium
      ELSE 0
    END
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  WHERE p.classification = 'gc' AND p.position BETWEEN 1 AND 3;

  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT p.entry_id, p.classification, 1,
    CASE
      WHEN p.classification = 'points' AND p.rider_id = v_points_winner THEN v_pts_jersey
      WHEN p.classification = 'kom' AND p.rider_id = v_kom_winner THEN v_pts_jersey
      WHEN p.classification = 'youth' AND p.rider_id = v_youth_winner THEN v_pts_jersey
      ELSE 0
    END
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  WHERE p.classification IN ('points', 'kom', 'youth') AND p.position = 1;
END
$function$;

CREATE OR REPLACE FUNCTION public.submit_stage_for_approval(p_stage_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_name text;
  v_is_gc boolean;
  v_game_id uuid;
  v_total integer;
  v_gc_rows integer;
  v_gc_positions integer;
  v_gc_riders integer;
  v_points_winners integer;
  v_mountain_winners integer;
  v_youth_winners integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stage_results WHERE stage_id = p_stage_id) THEN
    RAISE EXCEPTION 'Geen uitslag ingevuld voor deze etappe';
  END IF;

  SELECT is_gc, game_id INTO v_is_gc, v_game_id
  FROM public.stages WHERE id = p_stage_id FOR UPDATE;
  IF v_game_id IS NULL THEN RAISE EXCEPTION 'Etappe niet gevonden'; END IF;

  IF v_is_gc THEN
    SELECT
      count(*) FILTER (WHERE gc_position BETWEEN 1 AND 3),
      count(DISTINCT gc_position) FILTER (WHERE gc_position BETWEEN 1 AND 3),
      count(DISTINCT rider_id) FILTER (WHERE gc_position BETWEEN 1 AND 3),
      count(*) FILTER (WHERE points_position = 1),
      count(*) FILTER (WHERE mountain_position = 1),
      count(*) FILTER (WHERE youth_position = 1)
    INTO v_gc_rows, v_gc_positions, v_gc_riders,
         v_points_winners, v_mountain_winners, v_youth_winners
    FROM public.stage_results
    WHERE stage_id = p_stage_id;

    IF v_gc_rows <> 3 OR v_gc_positions <> 3 OR v_gc_riders <> 3 THEN
      RAISE EXCEPTION 'Het eindklassement moet precies drie unieke renners op GC-positie 1, 2 en 3 bevatten';
    END IF;
    IF v_points_winners <> 1 OR v_mountain_winners <> 1 OR v_youth_winners <> 1 THEN
      RAISE EXCEPTION 'Vul precies één winnaar in voor het punten-, berg- en jongerenklassement';
    END IF;

    -- De statuswijziging en bonusberekening zitten in dezelfde transactie. Een
    -- fout in de berekening zet de GC dus automatisch terug naar de oude staat.
    UPDATE public.stages
    SET results_status = 'pending', submitted_for_approval_at = now()
    WHERE id = p_stage_id AND results_status <> 'approved';

    PERFORM public.calculate_prediction_points(v_game_id);
    PERFORM public.update_total_ranking(v_game_id);

    SELECT count(*)::integer INTO v_total
    FROM public.entries WHERE game_id = v_game_id AND status = 'submitted';
    UPDATE public.stages
    SET calculation_status = 'completed',
        calculation_processed_count = v_total,
        calculation_total_count = v_total,
        calculation_completed_at = now(),
        calculation_error = NULL
    WHERE id = p_stage_id;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.stages
      WHERE id = p_stage_id AND calculation_status = 'completed'
    ) THEN
      RAISE EXCEPTION 'De puntenberekening is nog niet volledig afgerond';
    END IF;
    UPDATE public.stages
    SET results_status = 'pending', submitted_for_approval_at = now()
    WHERE id = p_stage_id AND results_status <> 'approved';
  END IF;

  SELECT display_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.results_approval_log(stage_id, action, actor_user_id, actor_display_name)
  VALUES (p_stage_id, 'submitted', auth.uid(), v_actor_name);
END
$$;

REVOKE EXECUTE ON FUNCTION public.calculate_prediction_points(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.submit_stage_for_approval(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.calculate_prediction_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_stage_for_approval(uuid) TO authenticated;

-- Rollback: herstel de definities uit
-- 20260729120000_predictions_pas_na_laatste_etappe.sql en
-- 20260801210000_stage_calculation_progress.sql.
