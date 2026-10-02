-- Meermarathon: niet elke wedstrijd telt even zwaar.
--
-- De beheerder geeft per wedstrijd een wegingsfactor op (Beheer › Wedstrijden).
-- Standaard 1; een Grand Prix die dubbel telt krijgt 2. Een rijder scoort in
-- die wedstrijd de punten uit het puntenschema maal de factor, afgerond op een
-- heel getal. Afronden gebeurt per rijder, zodat het race-dossier onder een
-- rijder precies optelt tot de ploegpunten van de wedstrijd.
--
-- Alleen de wedstrijdpunten wegen mee. De pronostiek (klassementswinnaars)
-- hoort bij geen enkele wedstrijd en telt zoals hij telde.
--
-- De kolom bestaat voor elke etappe, maar alleen het beheer van de
-- Meermarathon toont het veld. Bij de wielergames blijft hij 1 en verandert er
-- niets aan de telling.
--
-- Hieronder alle plekken die etappepunten afleiden uit stage_results +
-- points_schema, elk met de factor erbij:
--   calculate_stage_scores        de canonieke telling (ook herberekenen en v4)
--   calculate_stage_scores_batch  de voortgangsbalk in Beheer › Berekening
--   rider_stage_points            het race-dossier onder een rijder
--   rider_entry_totals            de punten per rijder in de ploeg
--   admin_stage_points_breakdown  de controle vóór het fiatteren
-- De vorm van die functies blijft gelijk: base_points/base_pts blijven de
-- schemapunten, multiplier blijft de jokerfactor, alleen het totaal weegt.
--
-- Plus zet_wegingsfactor: slaat de factor op en telt een al berekende
-- wedstrijd meteen opnieuw. Fiatteren rekent sinds 20260816120000 niet meer
-- zelf; zonder die herberekening zou een gewijzigde factor stilletjes de oude
-- punten publiceren.
--
-- Idempotent.

ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS wegingsfactor numeric(4,2) NOT NULL DEFAULT 1;

ALTER TABLE public.stages
  DROP CONSTRAINT IF EXISTS stages_wegingsfactor_check;
ALTER TABLE public.stages
  ADD CONSTRAINT stages_wegingsfactor_check
  CHECK (wegingsfactor > 0 AND wegingsfactor <= 10);

COMMENT ON COLUMN public.stages.wegingsfactor IS
  'Meermarathon: hoe zwaar de wedstrijd telt. Punten = schemapunten × factor, per rijder afgerond. Standaard 1.';


-- 1. De canonieke telling (basis: 20260814143500_prevent_gc_stage_points.sql).
CREATE OR REPLACE FUNCTION public.calculate_stage_scores(p_stage_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_game uuid;
  v_mult integer;
  v_is_gc boolean;
  v_weging numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT game_id, is_gc, COALESCE(wegingsfactor, 1)
    INTO v_game, v_is_gc, v_weging
  FROM public.stages
  WHERE id = p_stage_id;

  IF v_game IS NULL THEN RAISE EXCEPTION 'Stage not found'; END IF;

  -- Afgeleide data altijd eerst opruimen. Voor een GC-etappe is dit tevens de
  -- volledige berekening: die scoort uitsluitend via entry_prediction_points.
  DELETE FROM public.stage_points WHERE stage_id = p_stage_id;
  IF COALESCE(v_is_gc, false) THEN RETURN; END IF;

  SELECT COALESCE(joker_multiplier, 2)
    INTO v_mult
  FROM public.games
  WHERE id = v_game;
  IF v_mult IS NULL THEN v_mult := 2; END IF;

  WITH rider_pts AS (
    SELECT
      sr.rider_id,
      -- Wegingsfactor per rijder afronden, vóór de joker.
      round(COALESCE(ps.points, 0) * v_weging)::integer AS pts
    FROM public.stage_results sr
    LEFT JOIN public.points_schema ps
      ON ps.game_id = v_game
     AND ps.classification = 'stage'
     AND ps.position = sr.finish_position
    WHERE sr.stage_id = p_stage_id
      AND sr.finish_position IS NOT NULL
      AND sr.finish_position BETWEEN 1 AND 20
      AND COALESCE(sr.did_finish, true) = true
  ),
  entry_rider_pts AS (
    SELECT
      ep.entry_id,
      ep.rider_id,
      COALESCE(rp.pts, 0) AS base_pts,
      CASE WHEN ej.rider_id IS NOT NULL THEN v_mult ELSE 1 END AS mult
    FROM public.entry_picks ep
    JOIN public.entries e
      ON e.id = ep.entry_id
     AND e.game_id = v_game
     AND e.status = 'submitted'
    LEFT JOIN rider_pts rp ON rp.rider_id = ep.rider_id
    LEFT JOIN public.entry_jokers ej
      ON ej.entry_id = ep.entry_id
     AND ej.rider_id = ep.rider_id

    UNION ALL

    SELECT
      ej.entry_id,
      ej.rider_id,
      COALESCE(rp.pts, 0) AS base_pts,
      v_mult AS mult
    FROM public.entry_jokers ej
    JOIN public.entries e
      ON e.id = ej.entry_id
     AND e.game_id = v_game
     AND e.status = 'submitted'
    LEFT JOIN rider_pts rp ON rp.rider_id = ej.rider_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.entry_picks ep2
      WHERE ep2.entry_id = ej.entry_id
        AND ep2.rider_id = ej.rider_id
    )
  )
  INSERT INTO public.stage_points(stage_id, entry_id, points)
  SELECT p_stage_id, entry_id, SUM(base_pts * mult)::integer
  FROM entry_rider_pts
  GROUP BY entry_id;
END
$function$;


-- 2. De telling in porties (basis: 20260801210000_stage_calculation_progress.sql).
CREATE OR REPLACE FUNCTION public.calculate_stage_scores_batch(
  p_stage_id uuid,
  p_batch_size integer DEFAULT 100
)
RETURNS TABLE(processed_count integer, total_count integer, calculation_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_game_id uuid;
  v_mult integer;
  v_weging numeric;
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

  SELECT s.game_id, s.calculation_processed_count, s.calculation_total_count, s.calculation_status,
         COALESCE(s.wegingsfactor, 1)
    INTO v_game_id, v_processed, v_total, v_status, v_weging
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
    -- Wegingsfactor per rijder afronden, vóór de joker; zelfde regel als
    -- calculate_stage_scores.
    SELECT sr.rider_id, round(COALESCE(ps.points, 0) * v_weging)::integer AS points
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


-- 3. Race-dossier onder een rijder (basis: 20260608182203_bf639c08-….sql).
--    base_points blijft het schema, multiplier de joker; total_points weegt.
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
      round(COALESCE(ps.points, 0) * COALESCE(s.wegingsfactor, 1))::int
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


-- 4. Punten per rijder in de ploeg (basis: 20260727120000_rpc_resultaten_verborgen_tot_live.sql).
CREATE OR REPLACE FUNCTION public.rider_entry_totals(p_game_id uuid, p_entry_id uuid)
RETURNS TABLE (rider_id uuid, total_points int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH cfg AS (
    SELECT COALESCE(g.joker_multiplier, 2) AS mult
    FROM public.games g WHERE g.id = p_game_id
  )
  SELECT
    sr.rider_id,
    COALESCE(SUM(
      round(COALESCE(ps.points, 0) * COALESCE(s.wegingsfactor, 1))::int
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
    AND public.results_zichtbaar(p_game_id)
  GROUP BY sr.rider_id;
$$;


-- 5. Controle vóór het fiatteren (basis: 20260512180536_4423aff1-….sql).
--    Per regel komt de factor mee, zodat het beheer "50 × 2 = 100" kan tonen.
CREATE OR REPLACE FUNCTION public.admin_stage_points_breakdown(p_stage_id uuid)
 RETURNS TABLE(entry_id uuid, team_name text, display_name text, total_stage_points integer, breakdown jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH game AS (
    SELECT game_id, COALESCE(wegingsfactor, 1) AS weging
    FROM public.stages WHERE id = p_stage_id
  ),
  game_mult AS (
    SELECT COALESCE(g.joker_multiplier, 2) AS mult
    FROM public.games g WHERE g.id = (SELECT game_id FROM game)
  ),
  rider_pts AS (
    SELECT
      sr.rider_id,
      sr.finish_position,
      COALESCE(sr.did_finish, true) AS did_finish,
      COALESCE(ps.points, 0) AS pts
    FROM public.stage_results sr
    LEFT JOIN public.points_schema ps
      ON ps.game_id = (SELECT game_id FROM game)
     AND ps.classification = 'stage'
     AND ps.position = sr.finish_position
    WHERE sr.stage_id = p_stage_id
  ),
  entry_riders AS (
    SELECT ep.entry_id, ep.rider_id,
           CASE WHEN ej.rider_id IS NOT NULL THEN (SELECT mult FROM game_mult) ELSE 1 END AS mult,
           (ej.rider_id IS NOT NULL) AS is_joker
    FROM public.entry_picks ep
    JOIN public.entries e ON e.id = ep.entry_id
                         AND e.game_id = (SELECT game_id FROM game)
                         AND e.status = 'submitted'
    LEFT JOIN public.entry_jokers ej
      ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id

    UNION ALL

    SELECT ej.entry_id, ej.rider_id, (SELECT mult FROM game_mult) AS mult, true AS is_joker
    FROM public.entry_jokers ej
    JOIN public.entries e ON e.id = ej.entry_id
                         AND e.game_id = (SELECT game_id FROM game)
                         AND e.status = 'submitted'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.entry_picks ep2
      WHERE ep2.entry_id = ej.entry_id AND ep2.rider_id = ej.rider_id
    )
  ),
  rows AS (
    SELECT
      er.entry_id,
      er.rider_id,
      r.name AS rider_name,
      rp.finish_position,
      COALESCE(rp.pts, 0) AS base_pts,
      er.is_joker,
      er.mult,
      (SELECT weging FROM game) AS weging,
      CASE
        WHEN rp.finish_position IS NOT NULL
         AND rp.finish_position BETWEEN 1 AND 20
         AND rp.did_finish
        THEN round(COALESCE(rp.pts, 0) * (SELECT weging FROM game))::int * er.mult
        ELSE 0
      END AS total
    FROM entry_riders er
    LEFT JOIN public.riders r ON r.id = er.rider_id
    LEFT JOIN rider_pts rp ON rp.rider_id = er.rider_id
  )
  SELECT
    e.id AS entry_id,
    e.team_name,
    COALESCE(p.display_name, 'Onbekend') AS display_name,
    COALESCE(SUM(rows.total)::int, 0) AS total_stage_points,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'rider_id', rows.rider_id,
          'rider_name', rows.rider_name,
          'finish_position', rows.finish_position,
          'base_pts', rows.base_pts,
          'is_joker', rows.is_joker,
          'multiplier', rows.mult,
          'wegingsfactor', rows.weging,
          'total', rows.total
        )
        ORDER BY rows.total DESC NULLS LAST, rows.rider_name
      ) FILTER (WHERE rows.rider_id IS NOT NULL),
      '[]'::jsonb
    ) AS breakdown
  FROM public.entries e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  LEFT JOIN rows ON rows.entry_id = e.id
  WHERE public.is_admin()
    AND e.game_id = (SELECT game_id FROM game)
    AND e.status = 'submitted'
  GROUP BY e.id, e.team_name, p.display_name
  ORDER BY total_stage_points DESC, COALESCE(p.display_name, '');
$function$;


-- 6. Factor opslaan. Is de wedstrijd al geteld, dan meteen opnieuw tellen;
--    staat hij al in het klassement, dan ook de totaalstand bijwerken.
--    Geeft true terug als er opnieuw geteld is.
CREATE OR REPLACE FUNCTION public.zet_wegingsfactor(p_stage_id uuid, p_factor numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_factor numeric := round(p_factor, 2);
  v_game uuid;
  v_calc text;
  v_results text;
  v_herteld boolean := false;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_factor IS NULL OR v_factor <= 0 OR v_factor > 10 THEN
    RAISE EXCEPTION 'De wegingsfactor moet groter dan 0 en hooguit 10 zijn';
  END IF;

  SELECT game_id, calculation_status, results_status
    INTO v_game, v_calc, v_results
  FROM public.stages
  WHERE id = p_stage_id
  FOR UPDATE;

  IF v_game IS NULL THEN RAISE EXCEPTION 'Stage not found'; END IF;
  -- Halverwege een telling in porties zou de ene helft met de oude en de
  -- andere met de nieuwe factor tellen.
  IF v_calc IN ('processing', 'finalizing') THEN
    RAISE EXCEPTION 'De punten van deze wedstrijd worden nu berekend; wacht tot dat klaar is';
  END IF;

  UPDATE public.stages SET wegingsfactor = v_factor WHERE id = p_stage_id;

  IF EXISTS (SELECT 1 FROM public.stage_points sp WHERE sp.stage_id = p_stage_id) THEN
    PERFORM public.calculate_stage_scores(p_stage_id);
    v_herteld := true;
  END IF;

  IF v_results = 'approved' THEN
    PERFORM public.update_total_ranking(v_game);
  END IF;

  RETURN v_herteld;
END $$;

REVOKE ALL ON FUNCTION public.zet_wegingsfactor(uuid, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.zet_wegingsfactor(uuid, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.zet_wegingsfactor(uuid, numeric) TO authenticated;

-- Rollback:
--   Herstel de vijf functies uit hun basismigratie (zie de kopjes hierboven),
--   dan:
--   DROP FUNCTION public.zet_wegingsfactor(uuid, numeric);
--   ALTER TABLE public.stages DROP COLUMN wegingsfactor;
--   Een wedstrijd die met een andere factor dan 1 geteld is, moet daarna
--   opnieuw berekend worden.
