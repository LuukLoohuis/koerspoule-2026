-- Klikken op sponsorlinks tellen.
--
-- Sponsorlinks staan op vier plekken, ingevuld vanuit twee beheertabjes:
--   sponsors.link_url        → sponsorstrook op de voorpagina
--   prizes.sponsor_url       → dagprijs-banner in de Krant én de prijzenpagina
--   prizes.sponsor_url_2     → tweede sponsorknop op de prijzenpagina
-- Dezelfde link kan dus op meerdere plekken staan; die tellen apart, want
-- "waar levert deze sponsor het meeste op" is precies de vraag.
--
-- Bewust GEEN user_id: de vraag is hoe vaak, niet door wie. Daarmee is dit
-- geen persoonsgegeven en hoeft er niets over bezoekers bewaard te worden.
-- Ontdubbelen binnen de minuut gebeurt in de browser (zie logSponsorKlik).

CREATE TABLE IF NOT EXISTS public.sponsor_kliks (
  id          bigserial PRIMARY KEY,
  -- 'sponsor' = rij uit sponsors, 'prijs' = rij uit prizes.
  bron        text        NOT NULL CHECK (bron IN ('sponsor', 'prijs')),
  bron_id     uuid        NOT NULL,
  -- Welke kolom de link leverde; prijzen hebben er twee.
  veld        text        NOT NULL CHECK (veld IN ('link_url', 'sponsor_url', 'sponsor_url_2')),
  -- Waar op de site geklikt is.
  plek        text        NOT NULL CHECK (plek IN ('voorpagina', 'dagprijsbanner', 'prijzenpagina')),
  -- Vastgelegd bij de klik: blijft kloppen als de link later gewijzigd wordt.
  url         text        NOT NULL,
  game_id     uuid        NULL REFERENCES public.games(id) ON DELETE SET NULL,
  geklikt_op  timestamptz NOT NULL DEFAULT now()
);

-- De enige twee vragen die gesteld worden: "hoeveel per link" en "hoeveel
-- sinds datum". Eén index dekt beide.
CREATE INDEX IF NOT EXISTS sponsor_kliks_bron_tijd_idx
  ON public.sponsor_kliks (bron, bron_id, veld, plek, geklikt_op DESC);

ALTER TABLE public.sponsor_kliks ENABLE ROW LEVEL SECURITY;

-- Geen enkele policy voor anon/authenticated: melden gaat uitsluitend via de
-- functie hieronder, lezen uitsluitend via de admin-functie. Zo kan een
-- bezoeker geen tellingen inzien, wijzigen of leegtrekken.
DROP POLICY IF EXISTS sponsor_kliks_admin_select ON public.sponsor_kliks;
CREATE POLICY sponsor_kliks_admin_select ON public.sponsor_kliks
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Een policy zegt alleen wélke rijen een rol mag zien; of die rol de tabel
-- überhaupt mag aanraken is een GRANT. Tabellen uit een migratie krijgen die
-- niet vanzelf.
GRANT SELECT ON public.sponsor_kliks TO authenticated;
GRANT ALL    ON public.sponsor_kliks TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sponsor_kliks_id_seq TO service_role;

-- ── Melden ──────────────────────────────────────────────────────────────────
-- SECURITY DEFINER en alleen INSERT: een bezoeker (ook uitgelogd) mag een klik
-- melden, verder niets. De URL wordt niet van de client geloofd maar uit de
-- bronrij gehaald, zodat er geen willekeurige tekst in de tabel belandt.
CREATE OR REPLACE FUNCTION public.log_sponsor_klik(
  p_bron    text,
  p_bron_id uuid,
  p_veld    text,
  p_plek    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url  text;
  v_game uuid;
BEGIN
  IF p_bron = 'sponsor' AND p_veld = 'link_url' THEN
    SELECT link_url, NULL::uuid INTO v_url, v_game
    FROM public.sponsors WHERE id = p_bron_id AND zichtbaar;
  ELSIF p_bron = 'prijs' AND p_veld = 'sponsor_url' THEN
    SELECT sponsor_url, game_id INTO v_url, v_game
    FROM public.prizes WHERE id = p_bron_id;
  ELSIF p_bron = 'prijs' AND p_veld = 'sponsor_url_2' THEN
    SELECT sponsor_url_2, game_id INTO v_url, v_game
    FROM public.prizes WHERE id = p_bron_id;
  ELSE
    RETURN; -- onbekende combinatie: stil negeren, dit is geen kritiek pad
  END IF;

  -- Bestaat niet (meer), of heeft helemaal geen link: niets te tellen.
  IF v_url IS NULL OR btrim(v_url) = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.sponsor_kliks (bron, bron_id, veld, plek, url, game_id)
  VALUES (p_bron, p_bron_id, p_veld, p_plek, v_url, v_game);
END $$;

REVOKE ALL ON FUNCTION public.log_sponsor_klik(text, uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.log_sponsor_klik(text, uuid, text, text) TO anon, authenticated;

-- ── Lezen (beheer) ──────────────────────────────────────────────────────────
-- Eén rij per link-plek-combinatie, met de naam erbij zodat het beheerscherm
-- niets hoeft samen te voegen. Links zonder klikken komen ook terug: een nul
-- is zelf ook een antwoord.
CREATE OR REPLACE FUNCTION public.admin_sponsor_klikken(p_dagen int DEFAULT NULL)
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

    UNION ALL
    SELECT 'prijs', p.id, 'sponsor_url_2', 'prijzenpagina',
           COALESCE(NULLIF(btrim(p.sponsor_naam_2), ''), p.titel), p.sponsor_url_2
    FROM public.prizes p
    WHERE p.sponsor_url_2 IS NOT NULL AND btrim(p.sponsor_url_2) <> ''
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

REVOKE ALL ON FUNCTION public.admin_sponsor_klikken(int) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_sponsor_klikken(int) TO authenticated;

-- ── Dagprijs-banner: prijs-id meegeven ─────────────────────────────────────
-- De banner toonde de sponsorlink zonder te vertellen bij wélke prijs hij
-- hoort, dus die klik was nergens aan toe te wijzen. Een extra uitvoerkolom
-- kan niet met CREATE OR REPLACE; vandaar eerst weg, dan opnieuw. Verder
-- ongewijzigd t.o.v. 20260720120000.
DROP FUNCTION IF EXISTS public.get_dagprijs_banner(uuid);

CREATE FUNCTION public.get_dagprijs_banner(p_game_id uuid)
RETURNS TABLE (
  prijs_id uuid,
  titel text,
  sponsor_naam text,
  sponsor_logo_url text,
  sponsor_url text,
  banner_kicker text,
  banner_sponsor_label text,
  banner_waarde text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH vandaag AS (
    SELECT p.id, p.titel, p.sponsor_naam, p.sponsor_logo_url, p.sponsor_url,
           p.banner_kicker, p.banner_sponsor_label, p.banner_waarde
    FROM public.dagprijs_banner_planning pl
    JOIN public.stages s ON s.id = pl.stage_id
    JOIN public.prizes p ON p.id = pl.prize_id
    WHERE pl.game_id = p_game_id
      AND s.date = (now() AT TIME ZONE 'Europe/Amsterdam')::date
    LIMIT 1
  ),
  terugval AS (
    SELECT p.id, p.titel, p.sponsor_naam, p.sponsor_logo_url, p.sponsor_url,
           p.banner_kicker, p.banner_sponsor_label, p.banner_waarde
    FROM public.prizes p
    WHERE p.game_id = p_game_id AND p.is_dagprijs_vandaag = true
    LIMIT 1
  )
  SELECT * FROM vandaag
  UNION ALL
  SELECT * FROM terugval WHERE NOT EXISTS (SELECT 1 FROM vandaag)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_dagprijs_banner(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_dagprijs_banner(uuid) TO anon, authenticated;

-- Rollback:
--   DROP FUNCTION IF EXISTS public.admin_sponsor_klikken(int);
--   DROP FUNCTION IF EXISTS public.log_sponsor_klik(text, uuid, text, text);
--   DROP TABLE IF EXISTS public.sponsor_kliks;
--   (get_dagprijs_banner terugzetten: zie 20260720120000_dagprijs_banner_planning.sql)
