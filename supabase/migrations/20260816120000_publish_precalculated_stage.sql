-- Fiatteren publiceert de punten die de beheerder zojuist heeft gecontroleerd.
-- De vorige functie berekende bij de definitieve klik alle etappepunten opnieuw;
-- dat maakte de knop traag en kon de gecontroleerde uitkomst tijdens publicatie
-- nog veranderen. De berekening is al verplicht voltooid vóór een rit pending
-- kan worden, dus bij fiat hoeven alleen status en totaalstand te worden gezet.

CREATE OR REPLACE FUNCTION public.approve_stage_results(p_stage_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  SET results_status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  WHERE id = p_stage_id;

  -- Publiceer exact de vooraf berekende en gecontroleerde punten. Een laatste
  -- totalenrefresh houdt bestaande callers en de materialized leaderboard-view
  -- synchroon, zonder de etappe zelf opnieuw te scoren.
  PERFORM public.update_total_ranking(v_game);

  SELECT display_name INTO v_actor_name
  FROM public.profiles
  WHERE id = auth.uid();

  INSERT INTO public.results_approval_log(stage_id, action, actor_user_id, actor_display_name)
  VALUES (p_stage_id, 'approved', auth.uid(), v_actor_name);
END
$$;

REVOKE EXECUTE ON FUNCTION public.approve_stage_results(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.approve_stage_results(uuid) TO authenticated;

-- Rollback: herstel approve_stage_results uit
-- 20260801210000_stage_calculation_progress.sql. Dat brengt de trage
-- herberekening tijdens fiat terug.
