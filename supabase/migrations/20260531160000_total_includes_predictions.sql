-- Het totaalklassement moet de GC-/trui-voorspellingspunten MEETELLEN bij de
-- 21 etappepunten. update_total_ranking somde tot nu toe alleen stage_points,
-- waardoor de voorspellingspunten bij elke (her)berekening of fiattering weer
-- uit het totaal verdwenen. Nu: totaal = som(stage_points) + som(entry_prediction_points).

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
    SET total_points = EXCLUDED.total_points, updated_at = now();

  UPDATE public.entries e
  SET total_points = COALESCE(tp.total_points, 0)
  FROM public.total_points tp
  WHERE tp.entry_id = e.id AND e.game_id = p_game_id;
END $$;
