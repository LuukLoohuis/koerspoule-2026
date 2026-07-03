-- Vervolg op 20260726120000: ook de SECURITY DEFINER-RPC's (die om RLS heen
-- gaan) lekken geen resultaten meer vóór 'live'. Deelnemers krijgen tijdens
-- open/open_inschrijving gemaskeerde totalen (0) of lege sets; admins zien
-- alles (testmodus is een UI-schakelaar — de admin-rol zelf volstaat hier).
-- Idempotent.

-- Centrale poort: mag de aanroeper de resultaten van deze game zien?
CREATE OR REPLACE FUNCTION public.results_zichtbaar(p_game_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = p_game_id
      AND g.status NOT IN ('open','draft','concept','open_inschrijving')
  );
$$;
REVOKE ALL ON FUNCTION public.results_zichtbaar(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.results_zichtbaar(uuid) TO anon, authenticated;

-- 1. Klassement (Uitslagen): totalen gemaskeerd + neutrale sortering vóór live.
CREATE OR REPLACE FUNCTION public.game_entries_standings(p_game_id uuid)
RETURNS TABLE(id uuid, user_id uuid, team_name text, total_points integer, display_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    e.id,
    e.user_id,
    e.team_name,
    CASE WHEN public.results_zichtbaar(p_game_id) THEN e.total_points ELSE 0 END AS total_points,
    COALESCE(p.display_name, 'Onbekend') AS display_name
  FROM public.entries e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE auth.uid() IS NOT NULL
    AND e.game_id = p_game_id
    AND e.status = 'submitted'
  ORDER BY
    CASE WHEN public.results_zichtbaar(p_game_id) THEN e.total_points ELSE 0 END DESC,
    COALESCE(p.display_name, e.team_name, '') ASC;
$$;

-- 2. Game-brede detail (benchmark): totalen gemaskeerd, neutrale sortering.
CREATE OR REPLACE FUNCTION public.game_entries_detail(p_game_id uuid)
RETURNS TABLE(user_id uuid, display_name text, entry_id uuid, team_name text, total_points integer, picks jsonb, jokers jsonb, predictions jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    e.user_id,
    COALESCE(p.display_name, 'Onbekend') AS display_name,
    e.id AS entry_id,
    e.team_name,
    CASE WHEN public.results_zichtbaar(p_game_id) THEN COALESCE(e.total_points, 0) ELSE 0 END AS total_points,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('category_id', ep.category_id, 'rider_id', ep.rider_id) ORDER BY ep.category_id::text, ep.created_at)
       FROM public.entry_picks ep WHERE ep.entry_id = e.id),
      '[]'::jsonb
    ) AS picks,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('rider_id', ej.rider_id) ORDER BY ej.created_at)
       FROM public.entry_jokers ej WHERE ej.entry_id = e.id),
      '[]'::jsonb
    ) AS jokers,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('classification', epr.classification, 'position', epr.position, 'rider_id', epr.rider_id) ORDER BY epr.classification, epr.position)
       FROM public.entry_predictions epr WHERE epr.entry_id = e.id),
      '[]'::jsonb
    ) AS predictions
  FROM public.entries e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE e.game_id = p_game_id
    AND e.status = 'submitted'
  ORDER BY
    CASE WHEN public.results_zichtbaar(p_game_id) THEN COALESCE(e.total_points, 0) ELSE 0 END DESC,
    COALESCE(p.display_name, '') ASC;
$$;

-- 3. Subpoule-detail: idem.
CREATE OR REPLACE FUNCTION public.subpoule_entries_detail(p_subpoule_id uuid, p_game_id uuid)
RETURNS TABLE(user_id uuid, display_name text, entry_id uuid, team_name text, total_points integer, picks jsonb, jokers jsonb, predictions jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    m.user_id,
    COALESCE(p.display_name, 'Onbekend') AS display_name,
    e.id AS entry_id,
    e.team_name,
    CASE WHEN public.results_zichtbaar(p_game_id) THEN COALESCE(e.total_points, 0) ELSE 0 END AS total_points,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('category_id', ep.category_id, 'rider_id', ep.rider_id) ORDER BY ep.category_id::text, ep.created_at)
       FROM public.entry_picks ep WHERE ep.entry_id = e.id),
      '[]'::jsonb
    ) AS picks,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('rider_id', ej.rider_id) ORDER BY ej.created_at)
       FROM public.entry_jokers ej WHERE ej.entry_id = e.id),
      '[]'::jsonb
    ) AS jokers,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('classification', epr.classification, 'position', epr.position, 'rider_id', epr.rider_id) ORDER BY epr.classification, epr.position)
       FROM public.entry_predictions epr WHERE epr.entry_id = e.id),
      '[]'::jsonb
    ) AS predictions
  FROM public.subpoule_members m
  JOIN public.subpoules s ON s.id = m.subpoule_id
  LEFT JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN public.entries e
    ON e.user_id = m.user_id
   AND e.game_id = p_game_id
   AND e.status = 'submitted'
  WHERE m.subpoule_id = p_subpoule_id
    AND s.game_id = p_game_id
    AND (
      public.is_admin()
      OR s.owner_user_id = auth.uid()
      OR public.is_subpoule_member(p_subpoule_id, auth.uid())
    )
  ORDER BY
    CASE WHEN public.results_zichtbaar(p_game_id) THEN COALESCE(e.total_points, 0) ELSE 0 END DESC,
    COALESCE(p.display_name, '') ASC;
$$;

-- 4. Per-etappe-gemiddelden: leeg vóór live.
CREATE OR REPLACE FUNCTION public.game_stage_averages(p_game_id uuid)
RETURNS TABLE(stage_id uuid, avg_points numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sp.stage_id, AVG(sp.points)::numeric AS avg_points
  FROM public.stage_points sp
  JOIN public.stages s  ON s.id = sp.stage_id AND s.game_id = p_game_id
  JOIN public.entries e ON e.id = sp.entry_id AND e.status = 'submitted'
  WHERE public.results_zichtbaar(p_game_id)
  GROUP BY sp.stage_id;
$$;

-- 5. Eigen etapperangen: leeg vóór live.
CREATE OR REPLACE FUNCTION public.my_stage_ranks(p_game_id uuid, p_user_id uuid)
RETURNS TABLE(stage_id uuid, my_rank integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.stage_id, q.rnk::int AS my_rank
  FROM (
    SELECT sp.stage_id, sp.entry_id,
           RANK() OVER (PARTITION BY sp.stage_id ORDER BY sp.points DESC) AS rnk
    FROM public.stage_points sp
    JOIN public.stages s  ON s.id = sp.stage_id AND s.game_id = p_game_id
    JOIN public.entries e ON e.id = sp.entry_id AND e.status = 'submitted'
    WHERE sp.points > 0
  ) q
  JOIN public.entries me
    ON me.id = q.entry_id
   AND me.game_id = p_game_id
   AND me.user_id = p_user_id
   AND me.status = 'submitted'
  WHERE public.results_zichtbaar(p_game_id);
$$;

-- 6. Punten per renner (teamsheet): leeg vóór live.
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
    AND public.results_zichtbaar(p_game_id)
  GROUP BY sr.rider_id;
$$;

-- 7. Trui-klassementen (classification_results): zelfde poort als stage_results.
DROP POLICY IF EXISTS "read_classification_results" ON public.classification_results;
CREATE POLICY "read_classification_results" ON public.classification_results
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.stages s
        JOIN public.games g ON g.id = s.game_id
        WHERE s.id = classification_results.stage_id
          AND s.results_status = 'approved'
          AND g.status NOT IN ('open','draft','concept','open_inschrijving')
      )
    )
  );
