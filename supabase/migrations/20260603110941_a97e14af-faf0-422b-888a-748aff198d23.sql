-- 1) Voorbereiden
CREATE OR REPLACE FUNCTION public.recalc_prepare(p_game_id uuid)
RETURNS TABLE(stage_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  DELETE FROM public.stage_points
  WHERE stage_id IN (SELECT id FROM public.stages WHERE game_id = p_game_id);

  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  RETURN QUERY
    SELECT id FROM public.stages
    WHERE game_id = p_game_id AND results_status = 'approved'
    ORDER BY stage_number;
END $$;

-- 2) Eén etappe (her)berekenen
CREATE OR REPLACE FUNCTION public.recalc_stage(p_game_id uuid, p_stage_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.stages WHERE id = p_stage_id AND game_id = p_game_id
  ) THEN
    RAISE EXCEPTION 'Stage % hoort niet bij game %', p_stage_id, p_game_id;
  END IF;

  PERFORM public.calculate_stage_scores(p_stage_id);
END $$;

-- 3) Afronden
CREATE OR REPLACE FUNCTION public.recalc_finalize(p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  PERFORM public.calculate_prediction_points(p_game_id);
  PERFORM public.update_total_ranking(p_game_id);
END $$;

REVOKE ALL ON FUNCTION public.recalc_prepare(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalc_stage(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalc_finalize(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalc_prepare(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalc_stage(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalc_finalize(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.recalc_prepare(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_stage(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_finalize(uuid) TO authenticated;