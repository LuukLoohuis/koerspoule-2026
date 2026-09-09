-- ── Le Coup Manqué wijst nu de absoluut grootste gemiste kans aan ────────────
--
-- Tot nu koos het blok de categorie waar je het verst onder het poulegemiddelde
-- zat. Dat is "je achterstand op de concurrenten", niet "wat je liet liggen":
-- een renner die 90 punten pakte terwijl bijna niemand hem koos, kwam nooit
-- bovendrijven omdat het gemiddelde daar laag bleef.
--
-- entry_category_yield geeft daarom een kolom erbij: het hoogste aantal punten
-- dat in die categorie te halen viel, over álle renners die erin zaten -- niet
-- alleen over de renners die iemand daadwerkelijk koos. Met dezelfde
-- jokervermenigvuldiger die jij op die plek gebruikte, zodat het gat vergelijkt
-- wat vergelijkbaar is en aansluit op wat Le Coup Manqué zelf laat zien.
--
-- Het retourtype verandert, dus de functie moet eerst weg.

DROP FUNCTION IF EXISTS public.entry_category_yield(uuid, uuid);
DROP FUNCTION IF EXISTS public.entry_category_yield(uuid);

CREATE OR REPLACE FUNCTION public.entry_category_yield(
  p_entry_id uuid,
  p_subpoule_id uuid DEFAULT NULL
)
RETURNS TABLE (
  category_id uuid,
  category_name text,
  category_sort int,
  rider_name text,
  mijn_punten int,
  poule_gemiddelde int,
  poule_beste int,
  categorie_beste int
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
           (ej.rider_id IS NOT NULL) AS met_joker,
           (COALESCE(b.punten, 0) * CASE WHEN ej.rider_id IS NOT NULL THEN (SELECT mult FROM spel) ELSE 1 END)::int AS punten
    FROM public.entry_picks ep
    LEFT JOIN basis b ON b.rider_id = ep.rider_id
    LEFT JOIN public.entry_jokers ej ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
    WHERE ep.entry_id = (SELECT id FROM toegang)
  ),
  -- Wat er in die categorie te halen viel: de beste renner uit de hele
  -- categorie, met jouw jokerfactor op die plek.
  categorie_top AS (
    SELECT cr.category_id,
           MAX(
             COALESCE(b.punten, 0) * CASE WHEN m.met_joker THEN (SELECT mult FROM spel) ELSE 1 END
           )::int AS beste
    FROM public.category_riders cr
    JOIN mijn m ON m.category_id = cr.category_id
    LEFT JOIN basis b ON b.rider_id = cr.rider_id
    GROUP BY cr.category_id
  ),
  -- Alleen een subpoule waar de aanvrager zelf in zit telt als schaal.
  schaal AS (
    SELECT sp.id
    FROM public.subpoules sp
    WHERE sp.id = p_subpoule_id
      AND sp.game_id = (SELECT game_id FROM toegang)
      AND (
        public.is_admin()
        OR EXISTS (
          SELECT 1 FROM public.subpoule_members sm
          WHERE sm.subpoule_id = sp.id AND sm.user_id = auth.uid()
        )
      )
  ),
  -- Alle ingediende ploegen behalve die van admins: de hele poule.
  alle AS (
    SELECT e.id, e.user_id
    FROM public.entries e
    WHERE e.game_id = (SELECT game_id FROM toegang)
      AND e.status = 'submitted'
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = e.user_id AND ur.role = 'admin'
      )
  ),
  gekozen AS (
    SELECT a.id
    FROM alle a
    WHERE EXISTS (
      SELECT 1 FROM public.subpoule_members sm
      WHERE sm.subpoule_id = (SELECT id FROM schaal) AND sm.user_id = a.user_id
    )
  ),
  groep AS (
    SELECT id FROM gekozen WHERE (SELECT count(*) FROM gekozen) >= 2
    UNION ALL
    SELECT id FROM alle WHERE (SELECT count(*) FROM gekozen) < 2
  ),
  poule AS (
    SELECT ep.category_id,
           (COALESCE(b.punten, 0) * CASE WHEN ej.rider_id IS NOT NULL THEN (SELECT mult FROM spel) ELSE 1 END)::int AS punten
    FROM public.entry_picks ep
    JOIN groep g ON g.id = ep.entry_id
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
    COALESCE(g.beste, mijn.punten),
    COALESCE(ct.beste, mijn.punten)
  FROM mijn
  JOIN public.categories c ON c.id = mijn.category_id
  LEFT JOIN public.riders r ON r.id = mijn.rider_id
  LEFT JOIN gemiddelden g ON g.category_id = mijn.category_id
  LEFT JOIN categorie_top ct ON ct.category_id = mijn.category_id
  ORDER BY mijn.punten DESC;
$function$;

REVOKE ALL ON FUNCTION public.entry_category_yield(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.entry_category_yield(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
