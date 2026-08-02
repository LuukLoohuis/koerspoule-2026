-- Betrouwbare, tussentijds zichtbare voortgang voor etappeberekeningen.
ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS calculation_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS calculation_processed_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calculation_total_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calculation_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS calculation_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS calculation_error text;

ALTER TABLE public.stages DROP CONSTRAINT IF EXISTS stages_calculation_status_check;
ALTER TABLE public.stages ADD CONSTRAINT stages_calculation_status_check
  CHECK (calculation_status IN ('idle', 'processing', 'finalizing', 'completed', 'failed'));
ALTER TABLE public.stages DROP CONSTRAINT IF EXISTS stages_calculation_counts_check;
ALTER TABLE public.stages ADD CONSTRAINT stages_calculation_counts_check
  CHECK (
    calculation_processed_count >= 0
    AND calculation_total_count >= 0
    AND calculation_processed_count <= calculation_total_count
  );

-- Bestaande berekeningen blijven fiatteerbaar na uitrol van deze migratie.
UPDATE public.stages s
SET calculation_status = 'completed',
    calculation_processed_count = counts.total_count,
    calculation_total_count = counts.total_count,
    calculation_completed_at = counts.completed_at
FROM (
  SELECT sp.stage_id, count(*)::integer AS total_count, max(sp.created_at) AS completed_at
  FROM public.stage_points sp
  GROUP BY sp.stage_id
) counts
WHERE counts.stage_id = s.id
  AND s.calculation_status = 'idle';

-- Reeds ingediende/gefiatteerde historische etappes zijn per definitie door
-- de oude controleflow gegaan (ook GC-etappes zonder gewone stage_points).
UPDATE public.stages
SET calculation_status = 'completed',
    calculation_processed_count = GREATEST(calculation_processed_count, calculation_total_count),
    calculation_completed_at = COALESCE(calculation_completed_at, submitted_for_approval_at, approved_at)
WHERE results_status IN ('pending', 'approved')
  AND calculation_status = 'idle';

CREATE OR REPLACE FUNCTION public.begin_stage_score_calculation(p_stage_id uuid)
RETURNS TABLE(processed_count integer, total_count integer, calculation_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_game_id uuid;
  v_total integer;
  v_current_status text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT game_id, stages.calculation_status
    INTO v_game_id, v_current_status
  FROM public.stages
  WHERE id = p_stage_id
  FOR UPDATE;

  IF v_game_id IS NULL THEN RAISE EXCEPTION 'Stage not found'; END IF;
  IF v_current_status IN ('processing', 'finalizing') THEN
    RAISE EXCEPTION 'De berekening voor deze etappe loopt al';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stage_results WHERE stage_id = p_stage_id) THEN
    RAISE EXCEPTION 'Geen uitslag ingevuld voor deze etappe';
  END IF;

  SELECT count(*)::integer INTO v_total
  FROM public.entries
  WHERE game_id = v_game_id AND status = 'submitted';

  DELETE FROM public.stage_points WHERE stage_id = p_stage_id;
  UPDATE public.stages
  SET calculation_status = CASE WHEN v_total = 0 THEN 'finalizing' ELSE 'processing' END,
      calculation_processed_count = 0,
      calculation_total_count = v_total,
      calculation_started_at = now(),
      calculation_completed_at = NULL,
      calculation_error = NULL,
      results_status = CASE WHEN results_status = 'approved' THEN results_status ELSE 'draft' END,
      submitted_for_approval_at = CASE WHEN results_status = 'approved' THEN submitted_for_approval_at ELSE NULL END
  WHERE id = p_stage_id;

  RETURN QUERY SELECT 0, v_total, CASE WHEN v_total = 0 THEN 'finalizing' ELSE 'processing' END;
END $$;

CREATE OR REPLACE FUNCTION public.calculate_stage_scores_batch(
  p_stage_id uuid,
  p_batch_size integer DEFAULT 100
)
RETURNS TABLE(processed_count integer, total_count integer, calculation_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_game_id uuid;
  v_mult integer;
  v_processed integer;
  v_total integer;
  v_batch_count integer;
  v_next integer;
  v_status text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_batch_size < 1 OR p_batch_size > 500 THEN RAISE EXCEPTION 'Ongeldige batchgrootte'; END IF;

  -- Eén batch tegelijk per etappe; voorkomt dubbele verwerking bij dubbelklikken.
  PERFORM pg_advisory_xact_lock(hashtext(p_stage_id::text));

  SELECT s.game_id, s.calculation_processed_count, s.calculation_total_count, s.calculation_status
    INTO v_game_id, v_processed, v_total, v_status
  FROM public.stages s
  WHERE s.id = p_stage_id
  FOR UPDATE;

  IF v_game_id IS NULL THEN RAISE EXCEPTION 'Stage not found'; END IF;
  IF v_status <> 'processing' THEN
    RETURN QUERY SELECT v_processed, v_total, v_status;
    RETURN;
  END IF;

  SELECT COALESCE(g.joker_multiplier, 2) INTO v_mult FROM public.games g WHERE g.id = v_game_id;

  WITH batch_entries AS MATERIALIZED (
    SELECT e.id
    FROM public.entries e
    WHERE e.game_id = v_game_id AND e.status = 'submitted'
    ORDER BY e.id
    OFFSET v_processed LIMIT p_batch_size
  ),
  chosen_riders AS (
    SELECT be.id AS entry_id, ep.rider_id
    FROM batch_entries be JOIN public.entry_picks ep ON ep.entry_id = be.id
    UNION
    SELECT be.id AS entry_id, ej.rider_id
    FROM batch_entries be JOIN public.entry_jokers ej ON ej.entry_id = be.id
  ),
  rider_points AS (
    SELECT sr.rider_id, COALESCE(ps.points, 0)::integer AS points
    FROM public.stage_results sr
    LEFT JOIN public.points_schema ps
      ON ps.game_id = v_game_id
     AND ps.classification = 'stage'
     AND ps.position = sr.finish_position
    WHERE sr.stage_id = p_stage_id
      AND sr.finish_position BETWEEN 1 AND 20
      AND COALESCE(sr.did_finish, true)
  ),
  scores AS (
    SELECT cr.entry_id,
      sum(COALESCE(rp.points, 0) * CASE WHEN ej.rider_id IS NULL THEN 1 ELSE v_mult END)::integer AS points
    FROM chosen_riders cr
    LEFT JOIN rider_points rp ON rp.rider_id = cr.rider_id
    LEFT JOIN public.entry_jokers ej ON ej.entry_id = cr.entry_id AND ej.rider_id = cr.rider_id
    GROUP BY cr.entry_id
  ),
  inserted AS (
    INSERT INTO public.stage_points(stage_id, entry_id, points)
    SELECT p_stage_id, be.id, COALESCE(scores.points, 0)
    FROM batch_entries be
    LEFT JOIN scores ON scores.entry_id = be.id
    ON CONFLICT (stage_id, entry_id) DO UPDATE SET points = EXCLUDED.points
    RETURNING entry_id
  )
  SELECT count(*)::integer INTO v_batch_count FROM inserted;

  v_next := LEAST(v_total, v_processed + v_batch_count);
  v_status := CASE WHEN v_next >= v_total THEN 'finalizing' ELSE 'processing' END;
  UPDATE public.stages
  SET calculation_processed_count = v_next,
      calculation_status = v_status
  WHERE id = p_stage_id;

  RETURN QUERY SELECT v_next, v_total, v_status;
END $$;

CREATE OR REPLACE FUNCTION public.complete_stage_score_calculation(p_stage_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.stages
  SET calculation_status = 'completed',
      calculation_processed_count = calculation_total_count,
      calculation_completed_at = now(),
      calculation_error = NULL
  WHERE id = p_stage_id
    AND calculation_status = 'finalizing';
  IF NOT FOUND THEN RAISE EXCEPTION 'Berekening is nog niet klaar om af te ronden'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fail_stage_score_calculation(p_stage_id uuid, p_error text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.stages
  SET calculation_status = 'failed', calculation_error = left(COALESCE(p_error, 'Onbekende fout'), 1000)
  WHERE id = p_stage_id AND calculation_status IN ('processing', 'finalizing');
END $$;

CREATE OR REPLACE FUNCTION public.submit_stage_for_approval(p_stage_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_name text;
  v_is_gc boolean;
  v_game_id uuid;
  v_total integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stage_results WHERE stage_id = p_stage_id) THEN
    RAISE EXCEPTION 'Geen uitslag ingevuld voor deze etappe';
  END IF;
  SELECT is_gc, game_id INTO v_is_gc, v_game_id FROM public.stages WHERE id = p_stage_id FOR UPDATE;

  -- De GC-etappe scoort via entry_prediction_points en doorloopt daarom niet
  -- de gewone stage_points-batcher. Markeer die alleen gereed als er werkelijk
  -- voorspellingpunten zijn berekend.
  IF v_is_gc AND NOT EXISTS (
    SELECT 1 FROM public.stages WHERE id = p_stage_id AND calculation_status = 'completed'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.entry_prediction_points epp
      JOIN public.entries e ON e.id = epp.entry_id
      WHERE e.game_id = v_game_id
    ) THEN
      RAISE EXCEPTION 'Bereken eerst de eindklassement- en truivoorspellingen';
    END IF;
    SELECT count(*)::integer INTO v_total
    FROM public.entries WHERE game_id = v_game_id AND status = 'submitted';
    UPDATE public.stages
    SET calculation_status = 'completed',
        calculation_processed_count = v_total,
        calculation_total_count = v_total,
        calculation_completed_at = now(),
        calculation_error = NULL
    WHERE id = p_stage_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stages
    WHERE id = p_stage_id AND calculation_status = 'completed'
  ) THEN
    RAISE EXCEPTION 'De puntenberekening is nog niet volledig afgerond';
  END IF;
  UPDATE public.stages
     SET results_status = 'pending', submitted_for_approval_at = now()
   WHERE id = p_stage_id AND results_status <> 'approved';
  SELECT display_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.results_approval_log(stage_id, action, actor_user_id, actor_display_name)
    VALUES (p_stage_id, 'submitted', auth.uid(), v_actor_name);
END $$;

CREATE OR REPLACE FUNCTION public.approve_stage_results(p_stage_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_game uuid;
  v_actor_name text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT game_id INTO v_game
  FROM public.stages
  WHERE id = p_stage_id
    AND results_status = 'pending'
    AND calculation_status = 'completed'
  FOR UPDATE;
  IF v_game IS NULL THEN
    RAISE EXCEPTION 'Deze uitslag is nog niet volledig berekend en klaar voor fiat';
  END IF;

  UPDATE public.stages
  SET results_status = 'approved', approved_by = auth.uid(), approved_at = now()
  WHERE id = p_stage_id;

  -- Definitieve herberekening blijft de bestaande bron van waarheid bij fiat.
  PERFORM public.calculate_stage_scores(p_stage_id);
  PERFORM public.calculate_prediction_points(v_game);
  PERFORM public.update_total_ranking(v_game);

  SELECT display_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.results_approval_log(stage_id, action, actor_user_id, actor_display_name)
  VALUES (p_stage_id, 'approved', auth.uid(), v_actor_name);
END $$;

-- PostgreSQL kan de OUT-kolommen van een bestaande RETURNS TABLE-functie niet
-- via CREATE OR REPLACE wijzigen. Verwijder uitsluitend deze signatuur eerst.
DROP FUNCTION IF EXISTS public.admin_pending_approvals(uuid);

CREATE FUNCTION public.admin_pending_approvals(p_game_id uuid)
RETURNS TABLE(
  stage_id uuid, stage_number int, stage_name text, stage_date date,
  results_status text, submitted_for_approval_at timestamptz,
  approved_by uuid, approved_at timestamptz, approved_by_name text,
  calculation_status text, processed_count integer, total_count integer,
  calculation_started_at timestamptz, calculation_completed_at timestamptz,
  calculation_error text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.stage_number, s.name, s.date, s.results_status,
         s.submitted_for_approval_at, s.approved_by, s.approved_at, p.display_name,
         s.calculation_status, s.calculation_processed_count, s.calculation_total_count,
         s.calculation_started_at, s.calculation_completed_at, s.calculation_error
  FROM public.stages s
  LEFT JOIN public.profiles p ON p.id = s.approved_by
  WHERE public.is_admin() AND s.game_id = p_game_id
  ORDER BY
    CASE
      WHEN s.calculation_status IN ('processing','finalizing','failed') THEN 0
      WHEN s.results_status = 'pending' THEN 1
      WHEN s.results_status = 'draft' THEN 2 ELSE 3
    END,
    s.stage_number;
$$;

REVOKE EXECUTE ON FUNCTION public.begin_stage_score_calculation(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.calculate_stage_scores_batch(uuid, integer) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.complete_stage_score_calculation(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.fail_stage_score_calculation(uuid, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.admin_pending_approvals(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.begin_stage_score_calculation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_stage_scores_batch(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_stage_score_calculation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fail_stage_score_calculation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_pending_approvals(uuid) TO authenticated;
