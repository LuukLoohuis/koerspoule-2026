-- Voeg het winterthema toe zonder bestaande koers-thema's te wijzigen.
ALTER TABLE public.games
  DROP CONSTRAINT IF EXISTS games_theme_check;

ALTER TABLE public.games
  ADD CONSTRAINT games_theme_check
  CHECK (theme IS NULL OR theme IN ('roze', 'geel', 'rood', 'winter'));

UPDATE public.games
SET theme = 'winter'
WHERE game_type = 'meermarathon'
  AND theme IS DISTINCT FROM 'winter';
