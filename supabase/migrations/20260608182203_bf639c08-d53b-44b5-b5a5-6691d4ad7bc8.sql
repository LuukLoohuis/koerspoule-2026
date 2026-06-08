-- rider_stage_points: per-stage punten die één renner heeft gescoord binnen
-- een game. Gebruikt voor de inline "dossier"-dropdown onder een renner in
-- Mijn Ploeg.
--
-- Bron van waarheid = calculate_stage_scores(): een renner scoort etappe-
-- punten op basis van finish_position (klassement 'stage'), posities 1..20,
-- alleen als did_finish. KOM/GC/jeugd/punten-klassementen zitten NIET in de
-- per-etappe rennerpunten (die lopen via prediction-points), dus die nemen we
-- hier bewust niet mee — anders zou het totaal niet matchen met stage_points.
--
-- Joker: als p_entry_id is meegegeven en de renner staat als joker bij die
-- entry, dan telt joker_multiplier (zelfde regel als calculate_stage_scores).
-- Zonder p_entry_id is multiplier altijd 1 (kale rennerpunten).
--
-- Alleen GOEDGEKEURDE, niet-GC etappes. Alle goedgekeurde etappes komen terug
-- (ook 0-punten), zodat de UI een volledige tijdlijn kan tonen.

CREATE OR REPLACE FUNCTION public.rider_stage_points(
  p_game_id uuid,
  p_rider_id uuid,
  p_entry_id uuid DEFAULT NULL
)
RETURNS TABLE (
  stage_id uuid,
  stage_number int,
  stage_name text,
  stage_type text,
  finish_position int,
  base_points int,
  multiplier int,
  total_points int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH cfg AS (
    SELECT COALESCE(g.joker_multiplier, 2) AS mult
    FROM public.games g
    WHERE g.id = p_game_id
  ),
  joker AS (
    SELECT EXISTS (
      SELECT 1 FROM public.entry_jokers ej
      WHERE ej.entry_id = p_entry_id
        AND ej.rider_id = p_rider_id
    ) AS is_joker
  )
  SELECT
    s.id AS stage_id,
    s.stage_number,
    s.name AS stage_name,
    s.stage_type,
    sr.finish_position,
    COALESCE(ps.points, 0) AS base_points,
    CASE
      WHEN p_entry_id IS NOT NULL AND (SELECT is_joker FROM joker)
        THEN (SELECT mult FROM cfg)
      ELSE 1
    END AS multiplier,
    (
      COALESCE(ps.points, 0)
      * CASE
          WHEN p_entry_id IS NOT NULL AND (SELECT is_joker FROM joker)
            THEN (SELECT mult FROM cfg)
          ELSE 1
        END
    )::int AS total_points
  FROM public.stages s
  LEFT JOIN public.stage_results sr
    ON sr.stage_id = s.id
   AND sr.rider_id = p_rider_id
   AND COALESCE(sr.did_finish, true) = true
   AND sr.finish_position BETWEEN 1 AND 20
  LEFT JOIN public.points_schema ps
    ON ps.game_id = p_game_id
   AND ps.classification = 'stage'
   AND ps.position = sr.finish_position
  WHERE s.game_id = p_game_id
    AND s.results_status = 'approved'
    AND COALESCE(s.is_gc, false) = false
  ORDER BY s.stage_number;
$$;

-- Rechten: team sheets zijn publiek leesbaar, dus authenticated + anon mogen
-- deze RPC aanroepen. Eerst alles intrekken om defaults te resetten.
REVOKE ALL ON FUNCTION public.rider_stage_points(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rider_stage_points(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rider_stage_points(uuid, uuid, uuid) TO anon;

-- Index voor de rider-filter op stage_results (stage_id-index bestond al).
CREATE INDEX IF NOT EXISTS stage_results_rider_idx
  ON public.stage_results(rider_id);
CREATE INDEX IF NOT EXISTS stage_results_game_rider_idx
  ON public.stage_results(game_id, rider_id);

-- rider_entry_totals: totaal behaalde etappepunten PER RENNER voor één entry,
-- t/m de laatst gefiatteerde (approved) niet-GC etappe. Eén query voor de hele
-- ploeg, zodat elke renner-tegel z'n totaal kan tonen zonder N losse calls.
--
-- Zelfde scoring-regel als rider_stage_points/calculate_stage_scores:
-- finish_position (klassement 'stage', pos 1..20, did_finish) × joker-mult.
-- Joker-mult geldt alleen voor renners die joker zijn bij DEZE entry.
CREATE OR REPLACE FUNCTION public.rider_entry_totals(
  p_game_id uuid,
  p_entry_id uuid
)
RETURNS TABLE (
  rider_id uuid,
  total_points int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH cfg AS (
    SELECT COALESCE(g.joker_multiplier, 2) AS mult
    FROM public.games g WHERE g.id = p_game_id
  )
  SELECT
    sr.rider_id,
    COALESCE(SUM(
      COALESCE(ps.points, 0)
      * CASE WHEN ej.rider_id IS NOT NULL THEN (SELECT mult FROM cfg) ELSE 1 END
    ), 0)::int AS total_points
  FROM public.stage_results sr
  JOIN public.stages s
    ON s.id = sr.stage_id
   AND s.game_id = p_game_id
   AND s.results_status = 'approved'
   AND COALESCE(s.is_gc, false) = false
  LEFT JOIN public.points_schema ps
    ON ps.game_id = p_game_id
   AND ps.classification = 'stage'
   AND ps.position = sr.finish_position
  LEFT JOIN public.entry_jokers ej
    ON ej.entry_id = p_entry_id
   AND ej.rider_id = sr.rider_id
  WHERE COALESCE(sr.did_finish, true) = true
    AND sr.finish_position BETWEEN 1 AND 20
  GROUP BY sr.rider_id;
$$;

REVOKE ALL ON FUNCTION public.rider_entry_totals(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rider_entry_totals(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rider_entry_totals(uuid, uuid) TO anon;