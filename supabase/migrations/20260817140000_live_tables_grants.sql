-- Herstel: de live-tabellen waren voor niemand leesbaar.
--
-- 20260817090000 zette wel RLS-policies (`FOR SELECT USING (true)`) maar geen
-- GRANT. Een policy bepaalt alleen wélke rijen een rol mag zien; of die rol de
-- tabel überhaupt mag benaderen is een aparte rechtencheck. Tabellen die via
-- het Supabase-dashboard ontstaan krijgen die GRANT automatisch, tabellen uit
-- ruwe SQL niet. Gevolg: elke SELECT gaf "permission denied", ook voor
-- ingelogde deelnemers, en het live-tabje kon dus nooit verschijnen.

GRANT SELECT ON public.stage_live_tracks    TO anon, authenticated;
GRANT SELECT ON public.live_race_state      TO anon, authenticated;
GRANT SELECT ON public.live_rider_standings TO anon, authenticated;
GRANT SELECT ON public.live_premies         TO anon, authenticated;

-- Beheerders koppelen rondes aan banen vanuit de admin; het schrijfrecht zelf
-- wordt nog steeds door de RLS-policy stage_live_tracks_admin_write bewaakt.
GRANT INSERT, UPDATE, DELETE ON public.stage_live_tracks TO authenticated;

-- De sync draait met de service-role-sleutel en omzeilt RLS, maar heeft wel
-- tabelrechten nodig om te kunnen schrijven.
GRANT ALL ON public.stage_live_tracks    TO service_role;
GRANT ALL ON public.live_race_state      TO service_role;
GRANT ALL ON public.live_rider_standings TO service_role;
GRANT ALL ON public.live_premies         TO service_role;

-- Rollback:
--   REVOKE ALL ON public.stage_live_tracks, public.live_race_state,
--                 public.live_rider_standings, public.live_premies
--     FROM anon, authenticated, service_role;
