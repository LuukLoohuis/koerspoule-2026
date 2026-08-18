-- Sponsorklikken beperken tot de zichtbare koers.
--
-- Het overzicht toonde de prijzen van álle games door elkaar. Je beoordeelt
-- een prijssponsor per koers, dus het hoort te tonen wat er bij de game staat
-- die op dat moment zichtbaar is.
--
-- Platformsponsoren (de strook onderaan elke pagina) hangen aan geen enkele
-- koers en blijven daarom altijd staan.
--
-- Een extra argument vervangt de bestaande functie niet maar zou een tweede
-- overload maken; vandaar eerst weg, dan opnieuw.
DROP FUNCTION IF EXISTS public.admin_sponsor_klikken(int);

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
    -- Dezelfde prijslink verschijnt in de Krant én op de prijzenpagina.
    SELECT 'prijs', p.id, 'sponsor_url', plek.naam,
           COALESCE(NULLIF(btrim(p.sponsor_naam), ''), p.titel), p.sponsor_url
    FROM public.prizes p
    CROSS JOIN (VALUES ('dagprijsbanner'), ('prijzenpagina')) AS plek(naam)
    WHERE p.sponsor_url IS NOT NULL AND btrim(p.sponsor_url) <> ''
      AND (p_game_id IS NULL OR p.game_id = p_game_id)

    UNION ALL
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

-- Rollback: zie 20260818120000_sponsor_kliks.sql voor de versie zonder game.
