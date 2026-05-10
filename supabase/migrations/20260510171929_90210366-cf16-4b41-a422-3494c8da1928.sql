-- Refresh total_points for active Giro 2026 game (stage points only; predictions still 0 until final stage)
DO $$
DECLARE v_game uuid;
BEGIN
  SELECT id INTO v_game FROM public.games WHERE game_type='giro' AND year=2026 LIMIT 1;
  IF v_game IS NULL THEN RETURN; END IF;

  INSERT INTO public.total_points(entry_id, total_points, updated_at)
  SELECT
    e.id,
    (
      COALESCE((SELECT SUM(sp.points)
                  FROM public.stage_points sp
                  JOIN public.stages s ON s.id = sp.stage_id
                 WHERE sp.entry_id = e.id AND s.game_id = v_game), 0)
      +
      COALESCE((SELECT SUM(epp.points)
                  FROM public.entry_prediction_points epp
                 WHERE epp.entry_id = e.id), 0)
    )::int,
    now()
  FROM public.entries e
  WHERE e.game_id = v_game
  ON CONFLICT (entry_id) DO UPDATE
    SET total_points = EXCLUDED.total_points, updated_at = now();

  UPDATE public.entries e
  SET total_points = COALESCE(tp.total_points, 0)
  FROM public.total_points tp
  WHERE tp.entry_id = e.id AND e.game_id = v_game;
END $$;