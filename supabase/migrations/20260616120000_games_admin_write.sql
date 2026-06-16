-- Bug: de homepage-quote (Admin → Rubriek) bleef niet opgeslagen.
-- Oorzaak: op public.games staat RLS aan, maar er bestond alleen een SELECT-
-- policy (read_games). Zonder UPDATE-policy raakt een admin-update 0 rijen —
-- Postgres/PostgREST geeft daarbij GEEN error terug, dus de UI meldde "opgeslagen"
-- terwijl er niets werd weggeschreven. Geldt voor álle games-writes (ook thema,
-- status, datums in de Games-tab).
--
-- Fix: admins mogen games schrijven. Tevens de quote-kolommen idempotent borgen
-- voor het geval een eerdere migratie niet was uitgerold.

ALTER TABLE public.games ADD COLUMN IF NOT EXISTS homepage_quote text;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS homepage_quote_author text;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS homepage_quote_size integer;

DROP POLICY IF EXISTS games_admin_write ON public.games;
CREATE POLICY games_admin_write ON public.games
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
