-- ── Rendement telde de eigen inzending van een admin niet mee ────────────────
--
-- entry_category_yield haalt zowel jouw punten als het poulegemiddelde uit één
-- lijst, en die lijst laat admins weg -- dezelfde regel als in de klassementen.
-- Gevolg: voor een admin viel ook zijn éigen rij weg en gaf de functie niets
-- terug, waardoor het blok Rendement (en daarmee Le Coup Manqué) onzichtbaar
-- bleef.
--
-- Nu twee bronnen: jouw keuzes altijd, het gemiddelde zonder admins.

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
  -- Mijn eigen keuzes: geen filter, ook niet als ik admin ben.
  mijn AS (
    SELECT ep.category_id,
           ep.rider_id,
           (COALESCE(b.punten, 0) * CASE WHEN ej.rider_id IS NOT NULL THEN (SELECT mult FROM spel) ELSE 1 END)::int AS punten
    FROM public.entry_picks ep
    LEFT JOIN basis b ON b.rider_id = ep.rider_id
    LEFT JOIN public.entry_jokers ej ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
    WHERE ep.entry_id = (SELECT id FROM toegang)
  ),
  -- De vergelijkingsgroep: alle ingediende ploegen behalve die van admins,
  -- met per keuze de jokerfactor van díé inzending.
  poule AS (
    SELECT ep.category_id,
           (COALESCE(b.punten, 0) * CASE WHEN ej.rider_id IS NOT NULL THEN (SELECT mult FROM spel) ELSE 1 END)::int AS punten
    FROM public.entry_picks ep
    JOIN public.entries e ON e.id = ep.entry_id
                         AND e.game_id = (SELECT game_id FROM toegang)
                         AND e.status = 'submitted'
                         AND NOT EXISTS (
                           SELECT 1 FROM public.user_roles ur
                           WHERE ur.user_id = e.user_id AND ur.role = 'admin'
                         )
    LEFT JOIN basis b ON b.rider_id = ep.rider_id
    LEFT JOIN public.entry_jokers ej ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
  ),
  gemiddelden AS (
    SELECT category_id,
           ROUND(AVG(punten))::int AS gem,
           MAX(punten)::int AS beste
    FROM poule
    GROUP BY category_id
  )
  SELECT
    c.id,
    c.name,
    c.sort_order,
    r.name,
    mijn.punten,
    COALESCE(g.gem, 0),
    COALESCE(g.beste, mijn.punten)
  FROM mijn
  JOIN public.categories c ON c.id = mijn.category_id
  LEFT JOIN public.riders r ON r.id = mijn.rider_id
  LEFT JOIN gemiddelden g ON g.category_id = mijn.category_id
  ORDER BY mijn.punten DESC;
$function$;

REVOKE ALL ON FUNCTION public.entry_category_yield(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.entry_category_yield(uuid) TO authenticated;
