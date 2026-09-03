-- ── De oogst: waar de punten van één etappe vandaan kwamen ───────────────────
--
-- De Volgwagen laat per etappe zien welke renner welk punt bracht, mét de
-- rekensom (basis × joker). Die uitsplitsing bestond al in
-- admin_stage_points_breakdown, maar die functie is afgeschermd met is_admin()
-- en levert álle inzendingen -- voor een deelnemer allebei verkeerd.
--
-- Deze variant doet hetzelfde voor precies één inzending, en alleen voor wie er
-- recht op heeft: de eigenaar of een admin. Rekenregel letterlijk gelijk aan
-- de admin-functie, zodat de oogst optelt tot hetzelfde getal als stage_points.
--
-- Renners zonder punten blijven in het resultaat staan: een lege dag van je
-- sprinter is informatie, geen ruis. De UI beslist wat ze ermee doet.

CREATE OR REPLACE FUNCTION public.entry_stage_harvest(p_entry_id uuid, p_stage_id uuid)
RETURNS TABLE (
  rider_id uuid,
  rider_name text,
  category_name text,
  category_sort int,
  finish_position int,
  base_points int,
  multiplier int,
  is_joker boolean,
  did_finish boolean,
  total_points int
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH toegang AS (
    SELECT e.id, e.game_id
    FROM public.entries e
    WHERE e.id = p_entry_id
      AND (e.user_id = auth.uid() OR public.is_admin())
  ),
  spel AS (
    SELECT COALESCE(g.joker_multiplier, 2) AS mult
    FROM public.games g
    WHERE g.id = (SELECT game_id FROM toegang)
  ),
  uitslag AS (
    SELECT
      sr.rider_id,
      sr.finish_position,
      COALESCE(sr.did_finish, true) AS did_finish,
      COALESCE(ps.points, 0) AS pts
    FROM public.stage_results sr
    LEFT JOIN public.points_schema ps
      ON ps.game_id = (SELECT game_id FROM toegang)
     AND ps.classification = 'stage'
     AND ps.position = sr.finish_position
    WHERE sr.stage_id = p_stage_id
  ),
  -- Keuzes plus losse jokers, net als in de admin-functie: een joker die geen
  -- categoriekeuze is telt óók mee.
  mijn_renners AS (
    SELECT ep.rider_id,
           c.name AS category_name,
           c.sort_order AS category_sort,
           CASE WHEN ej.rider_id IS NOT NULL THEN (SELECT mult FROM spel) ELSE 1 END AS mult,
           (ej.rider_id IS NOT NULL) AS is_joker
    FROM public.entry_picks ep
    JOIN public.categories c ON c.id = ep.category_id
    LEFT JOIN public.entry_jokers ej
      ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
    WHERE ep.entry_id = (SELECT id FROM toegang)

    UNION ALL

    SELECT ej.rider_id, NULL::text, 9999, (SELECT mult FROM spel), true
    FROM public.entry_jokers ej
    WHERE ej.entry_id = (SELECT id FROM toegang)
      AND NOT EXISTS (
        SELECT 1 FROM public.entry_picks ep2
        WHERE ep2.entry_id = ej.entry_id AND ep2.rider_id = ej.rider_id
      )
  )
  SELECT
    mr.rider_id,
    r.name AS rider_name,
    mr.category_name,
    mr.category_sort,
    u.finish_position,
    COALESCE(u.pts, 0)::int AS base_points,
    mr.mult::int AS multiplier,
    mr.is_joker,
    COALESCE(u.did_finish, true) AS did_finish,
    CASE
      WHEN u.finish_position IS NOT NULL
       AND u.finish_position BETWEEN 1 AND 20
       AND u.did_finish
      THEN (COALESCE(u.pts, 0) * mr.mult)::int
      ELSE 0
    END AS total_points
  FROM mijn_renners mr
  LEFT JOIN public.riders r ON r.id = mr.rider_id
  LEFT JOIN uitslag u ON u.rider_id = mr.rider_id
  ORDER BY 10 DESC, mr.category_sort, r.name;
$function$;

REVOKE ALL ON FUNCTION public.entry_stage_harvest(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.entry_stage_harvest(uuid, uuid) TO authenticated;
