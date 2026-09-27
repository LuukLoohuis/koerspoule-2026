-- Meermarathon-pronostiek: punten voor de winnaars van het Cup-klassement
-- (kunstijs) en het Grand Prix-klassement (natuurijs).
--
-- De wielergames scoren hun voorspellingen op een eind-GC-etappe met een
-- podium en drie truien. Dat past niet op de schaatsgame: daar zijn het twee
-- losse klassementen, en submit_stage_for_approval eist voor een GC-etappe
-- precies één punten-, berg- en jongerenwinnaar. Daarom een eigen tabel waarin
-- de beheerder aan het eind van het seizoen per peloton (game) de twee
-- winnaars zet.
--
-- Een goede voorspelling levert 50 punten op (user, 2026-09-27), per game te
-- overschrijven met points_schema 'pred_klassement'. De punten gaan, net als
-- bij de wielergames, in entry_prediction_points; update_total_ranking telt
-- ze daar al mee in het totaal.
--
-- calculate_prediction_points wist aan het begin alle voorspelpunten van de
-- game en rekent ze opnieuw. Het schaatsdeel staat daarom in díe functie en
-- vóór de terugkeer zonder eind-GC: zo blijven de punten staan na een
-- herberekening van een wedstrijd of een volledige herberekening
-- (recalc_finalize), die allebei via deze functie lopen.

-- ── 1. Winnaars per klassement ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.klassement_winnaars (
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  klassement text NOT NULL CHECK (klassement IN ('cup', 'grandprix')),
  rider_id uuid NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, klassement)
);

ALTER TABLE public.klassement_winnaars ENABLE ROW LEVEL SECURITY;

-- Een eindklassement is openbaar, net als een uitslag. Schrijven gaat alleen
-- via zet_klassement_winnaars.
DROP POLICY IF EXISTS klassement_winnaars_select ON public.klassement_winnaars;
CREATE POLICY klassement_winnaars_select ON public.klassement_winnaars
  FOR SELECT USING (true);

GRANT SELECT ON public.klassement_winnaars TO anon, authenticated;

-- ── 2. Puntenschema: 'pred_klassement' toestaan ────────────────────────────

ALTER TABLE public.points_schema DROP CONSTRAINT IF EXISTS points_schema_classification_check;
ALTER TABLE public.points_schema
  ADD CONSTRAINT points_schema_classification_check
  CHECK (classification IN ('stage', 'gc', 'kom', 'points', 'youth',
                            'pred_gc_exact', 'pred_gc_podium', 'pred_jersey', 'pred_klassement'));

-- ── 3. calculate_prediction_points met het schaatsdeel ─────────────────────
-- Gelijk aan 20260814140000_smooth_gc_approval.sql, plus het blok
-- "Meermarathon" direct na het wissen.

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
  v_pts_klassement integer;
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
  SELECT COALESCE((SELECT points FROM public.points_schema
                   WHERE game_id = p_game_id AND classification = 'pred_klassement' AND position = 1), 50)
    INTO v_pts_klassement;

  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  -- Meermarathon: winnaar van het Cup- en het Grand Prix-klassement. Alleen
  -- klassementen waarvan de winnaar al vaststaat; alleen goede voorspellingen
  -- krijgen een rij (zoals de gepagineerde berekening in het beheer doet).
  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT DISTINCT ON (p.entry_id, p.classification) p.entry_id, p.classification, 1, v_pts_klassement
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  JOIN public.klassement_winnaars k
    ON k.game_id = p_game_id AND k.klassement = p.classification AND k.rider_id = p.rider_id
  WHERE p.classification IN ('cup', 'grandprix') AND p.position = 1;

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

REVOKE EXECUTE ON FUNCTION public.calculate_prediction_points(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.calculate_prediction_points(uuid) TO authenticated;

-- ── 4. De winnaars zetten ──────────────────────────────────────────────────
-- NULL haalt een winnaar weg (bv. na een vergissing). Daarna meteen punten en
-- totaalstand opnieuw, in dezelfde transactie: gaat er iets mis, dan staat
-- alles zoals het was.

CREATE OR REPLACE FUNCTION public.zet_klassement_winnaars(
  p_game_id uuid,
  p_cup uuid,
  p_grandprix uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_type text;
  v_rider uuid;
  v_klassement text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT game_type INTO v_type FROM public.games WHERE id = p_game_id;
  IF v_type IS NULL THEN RAISE EXCEPTION 'Game niet gevonden'; END IF;
  IF v_type <> 'meermarathon' THEN
    RAISE EXCEPTION 'Klassementswinnaars bestaan alleen bij de Meermarathon';
  END IF;

  FOREACH v_klassement IN ARRAY ARRAY['cup', 'grandprix'] LOOP
    v_rider := CASE v_klassement WHEN 'cup' THEN p_cup ELSE p_grandprix END;
    IF v_rider IS NULL THEN
      DELETE FROM public.klassement_winnaars WHERE game_id = p_game_id AND klassement = v_klassement;
    ELSE
      IF NOT EXISTS (
        SELECT 1
        FROM public.riders r
        JOIN public.teams t ON t.id = r.team_id
        WHERE r.id = v_rider AND t.game_id = p_game_id
      ) THEN
        RAISE EXCEPTION 'Deze rijder hoort niet bij dit peloton.';
      END IF;
      INSERT INTO public.klassement_winnaars (game_id, klassement, rider_id, updated_at)
      VALUES (p_game_id, v_klassement, v_rider, now())
      ON CONFLICT (game_id, klassement)
        DO UPDATE SET rider_id = EXCLUDED.rider_id, updated_at = now();
    END IF;
  END LOOP;

  PERFORM public.calculate_prediction_points(p_game_id);
  PERFORM public.update_total_ranking(p_game_id);
END
$function$;

REVOKE EXECUTE ON FUNCTION public.zet_klassement_winnaars(uuid, uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.zet_klassement_winnaars(uuid, uuid, uuid) TO authenticated;

-- Rollback:
--   DROP FUNCTION IF EXISTS public.zet_klassement_winnaars(uuid, uuid, uuid);
--   Herstel calculate_prediction_points uit 20260814140000_smooth_gc_approval.sql.
--   DELETE FROM public.points_schema WHERE classification = 'pred_klassement';
--   Herstel points_schema_classification_check uit 20260531190112 (zonder 'pred_klassement').
--   DROP TABLE IF EXISTS public.klassement_winnaars;
