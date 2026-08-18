-- Hors Catégorie-banner in de Krant aan/uit per game.
--
-- Die teaser stond er altijd, ook bij een koers waar de statistieken nog
-- nergens op slaan (geen etappes verwerkt = een banner die naar lege
-- grafieken wijst). Nu een schakelaar in Go-live, naast de andere
-- banner-schakelaars.
--
-- Standaard AAN: de banner staat er nu ook, dus zonder default zou hij bij
-- iedere lopende game verdwijnen zodra deze migratie draait.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS hors_banner_visible boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.games.hors_banner_visible IS
  'Toont de Hors Categorie-teaser in de Krant. Handmatig per game, via Go-live.';

-- Rollback:
--   ALTER TABLE public.games DROP COLUMN IF EXISTS hors_banner_visible;
