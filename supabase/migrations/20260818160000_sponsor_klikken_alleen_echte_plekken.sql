-- Alleen plekken tonen waar de link ook echt staat.
--
-- De vorige versie zette élke prijs met een sponsorlink op twee plekken: de
-- prijzenpagina én de dagprijs-banner in de Krant. Dat klopt niet. Een prijs
-- verschijnt alleen in die banner als hij daar ook voor is ingepland, of als
-- is_dagprijs_vandaag aanstaat — precies de twee gevallen die
-- get_dagprijs_banner kent.
--
-- Gevolg was een overzicht vol regels die nooit een klik kunnen krijgen: een
-- sponsor die geen dagprijs heeft, kreeg toch een "Krant · dagprijs"-regel op
-- nul. Dat leest als een plek die niet werkt in plaats van een plek die niet
-- bestaat.
DROP FUNCTION IF EXISTS public.admin_sponsor_klikken(int, uuid);

CREATE FUNCTION public.admin_sponsor_klikken(
  p_dagen   int  DEFAULT NULL,
  p_game_id uuid DEFAULT NULL
)
RETURNS TABLE (
  bron    text,
  bron_id uuid,
  veld    text,
  plek    text,
  naam    text,
  url     text,
  aantal  bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH links AS (
    -- Platformsponsoren: niet aan een koers gebonden, dus altijd tonen.
    SELECT 'sponsor'::text AS bron, s.id AS bron_id, 'link_url'::text AS veld,
           'voorpagina'::text AS plek,
           COALESCE(NULLIF(btrim(s.weergavenaam), ''), s.naam) AS naam,
           s.link_url AS url
    FROM public.sponsors s
    WHERE s.link_url IS NOT NULL AND btrim(s.link_url) <> ''

    UNION ALL
    -- Prijzenpagina: elke prijs met een sponsorlink staat daar.
    SELECT 'prijs', p.id, 'sponsor_url', 'prijzenpagina',
           COALESCE(NULLIF(btrim(p.sponsor_naam), ''), p.titel), p.sponsor_url
    FROM public.prizes p
    WHERE p.sponsor_url IS NOT NULL AND btrim(p.sponsor_url) <> ''
      AND (p_game_id IS NULL OR p.game_id = p_game_id)

    UNION ALL
    -- Dagprijs-banner: alleen als de prijs daar ook echt kan verschijnen.
    SELECT 'prijs', p.id, 'sponsor_url', 'dagprijsbanner',
           COALESCE(NULLIF(btrim(p.sponsor_naam), ''), p.titel), p.sponsor_url
    FROM public.prizes p
    WHERE p.sponsor_url IS NOT NULL AND btrim(p.sponsor_url) <> ''
      AND (p_game_id IS NULL OR p.game_id = p_game_id)
      AND (
        p.is_dagprijs_vandaag = true
        OR EXISTS (
          SELECT 1 FROM public.dagprijs_banner_planning pl WHERE pl.prize_id = p.id
        )
      )

    UNION ALL
    -- De tweede sponsorknop bestaat alleen op de prijzenpagina.
    SELECT 'prijs', p.id, 'sponsor_url_2', 'prijzenpagina',
           COALESCE(NULLIF(btrim(p.sponsor_naam_2), ''), p.titel), p.sponsor_url_2
    FROM public.prizes p
    WHERE p.sponsor_url_2 IS NOT NULL AND btrim(p.sponsor_url_2) <> ''
      AND (p_game_id IS NULL OR p.game_id = p_game_id)
  )
  SELECT l.bron, l.bron_id, l.veld, l.plek, l.naam, l.url,
         COUNT(k.id) AS aantal
  FROM links l
  LEFT JOIN public.sponsor_kliks k
    ON  k.bron = l.bron AND k.bron_id = l.bron_id
    AND k.veld = l.veld AND k.plek = l.plek
    AND (p_dagen IS NULL OR k.geklikt_op >= now() - make_interval(days => p_dagen))
  WHERE public.is_admin()
  GROUP BY l.bron, l.bron_id, l.veld, l.plek, l.naam, l.url
  ORDER BY aantal DESC, l.naam;
$$;

REVOKE ALL ON FUNCTION public.admin_sponsor_klikken(int, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_sponsor_klikken(int, uuid) TO authenticated;
