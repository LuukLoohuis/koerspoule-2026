-- ── Rendement per keuze en Le Coup Manqué ────────────────────────────────────
--
-- Twee vragen die de Volgwagen wél kan beantwoorden en de Krant niet:
--   1. Wat leverde elke categoriekeuze op, afgezet tegen wat de rest van de
--      poule uit diezelfde categorie haalde?
--   2. Wat had een niet-gekozen renner uit die categorie opgeleverd?
--
-- Beide rekenen met dezelfde regel als het fiatteren: punten uit points_schema
-- voor de finishpositie, alleen top 20, alleen wie finishte, en jouw
-- jokervermenigvuldiger. Zo sluiten de uitkomsten aan op je puntentotaal.
--
-- Alleen zichtbaar voor de eigenaar van de inzending of een admin; beide
-- functies werken maar over één entry tegelijk.

-- Gedeelde bron: wat elke renner in deze game per etappe opleverde, kaal.
CREATE OR REPLACE FUNCTION public.rider_base_points(p_game_id uuid)
RETURNS TABLE (rider_id uuid, punten int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT sr.rider_id,
         COALESCE(SUM(
           CASE
             WHEN sr.finish_position BETWEEN 1 AND 20 AND COALESCE(sr.did_finish, true)
             THEN COALESCE(ps.points, 0)
             ELSE 0
           END
         ), 0)::int AS punten
  FROM public.stage_results sr
  JOIN public.stages s ON s.id = sr.stage_id AND s.game_id = p_game_id
  LEFT JOIN public.points_schema ps
    ON ps.game_id = p_game_id
   AND ps.classification = 'stage'
   AND ps.position = sr.finish_position
  GROUP BY sr.rider_id;
$function$;

REVOKE ALL ON FUNCTION public.rider_base_points(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.rider_base_points(uuid) TO authenticated;

-- 1. Rendement per categorie: mijn punten naast het poulegemiddelde.
CREATE OR REPLACE FUNCTION public.entry_category_yield(p_entry_id uuid)
RETURNS TABLE (
  category_id uuid,
  category_name text,
  category_sort int,
  rider_name text,
  mijn_punten int,
  poule_gemiddelde int,
  poule_beste int
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH toegang AS (
    SELECT e.id, e.game_id, e.user_id
    FROM public.entries e
    WHERE e.id = p_entry_id
      AND (e.user_id = auth.uid() OR public.is_admin())
  ),
  spel AS (
    SELECT COALESCE(g.joker_multiplier, 2) AS mult
    FROM public.games g WHERE g.id = (SELECT game_id FROM toegang)
  ),
  basis AS (
    SELECT * FROM public.rider_base_points((SELECT game_id FROM toegang))
  ),
  -- Elke inzending in deze game, met per keuze de punten van die renner en de
  -- jokerfactor van díé inzending -- anders vergelijk je jouw dubbeltelling
  -- met andermans enkele.
  alle AS (
    SELECT ep.entry_id,
           ep.category_id,
           ep.rider_id,
           (COALESCE(b.punten, 0) * CASE WHEN ej.rider_id IS NOT NULL THEN (SELECT mult FROM spel) ELSE 1 END)::int AS punten
    FROM public.entry_picks ep
    JOIN public.entries e ON e.id = ep.entry_id
                         AND e.game_id = (SELECT game_id FROM toegang)
                         AND e.status = 'submitted'
                         -- Admins tellen niet mee in het poulegemiddelde,
                         -- dezelfde regel als in de klassementen.
                         AND NOT EXISTS (
                           SELECT 1 FROM public.user_roles ur
                           WHERE ur.user_id = e.user_id AND ur.role = 'admin'
                         )
    LEFT JOIN basis b ON b.rider_id = ep.rider_id
    LEFT JOIN public.entry_jokers ej ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
  )
  SELECT
    c.id AS category_id,
    c.name AS category_name,
    c.sort_order AS category_sort,
    r.name AS rider_name,
    mijn.punten AS mijn_punten,
    ROUND(AVG(alle.punten))::int AS poule_gemiddelde,
    MAX(alle.punten)::int AS poule_beste
  FROM alle mijn
  JOIN public.categories c ON c.id = mijn.category_id
  LEFT JOIN public.riders r ON r.id = mijn.rider_id
  JOIN alle ON alle.category_id = mijn.category_id
  WHERE mijn.entry_id = (SELECT id FROM toegang)
  GROUP BY c.id, c.name, c.sort_order, r.name, mijn.punten
  ORDER BY mijn.punten DESC;
$function$;

REVOKE ALL ON FUNCTION public.entry_category_yield(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.entry_category_yield(uuid) TO authenticated;

-- 2. Le Coup Manqué: wat de niet-gekozen renners uit één categorie opleverden.
CREATE OR REPLACE FUNCTION public.entry_category_alternatives(p_entry_id uuid, p_category_id uuid)
RETURNS TABLE (
  rider_id uuid,
  rider_name text,
  punten int,
  is_mijn_keuze boolean,
  gekozen_door int
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
    FROM public.games g WHERE g.id = (SELECT game_id FROM toegang)
  ),
  basis AS (
    SELECT * FROM public.rider_base_points((SELECT game_id FROM toegang))
  ),
  mijn AS (
    SELECT ep.rider_id,
           (ej.rider_id IS NOT NULL) AS met_joker
    FROM public.entry_picks ep
    LEFT JOIN public.entry_jokers ej ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
    WHERE ep.entry_id = (SELECT id FROM toegang)
      AND ep.category_id = p_category_id
  ),
  populariteit AS (
    SELECT ep.rider_id, COUNT(*)::int AS aantal
    FROM public.entry_picks ep
    JOIN public.entries e ON e.id = ep.entry_id
                         AND e.game_id = (SELECT game_id FROM toegang)
                         AND e.status = 'submitted'
    WHERE ep.category_id = p_category_id
    GROUP BY ep.rider_id
  )
  SELECT
    cr.rider_id,
    r.name AS rider_name,
    -- Vergelijk eerlijk: de alternatieve renner krijgt dezelfde
    -- jokervermenigvuldiger die jíj op deze plek gebruikte.
    (COALESCE(b.punten, 0) * CASE WHEN (SELECT met_joker FROM mijn LIMIT 1) THEN (SELECT mult FROM spel) ELSE 1 END)::int AS punten,
    (cr.rider_id = (SELECT rider_id FROM mijn LIMIT 1)) AS is_mijn_keuze,
    COALESCE(p.aantal, 0) AS gekozen_door
  FROM public.category_riders cr
  LEFT JOIN public.riders r ON r.id = cr.rider_id
  LEFT JOIN basis b ON b.rider_id = cr.rider_id
  LEFT JOIN populariteit p ON p.rider_id = cr.rider_id
  WHERE cr.category_id = p_category_id
    AND EXISTS (SELECT 1 FROM toegang)
  ORDER BY 3 DESC, r.name;
$function$;

REVOKE ALL ON FUNCTION public.entry_category_alternatives(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.entry_category_alternatives(uuid, uuid) TO authenticated;
