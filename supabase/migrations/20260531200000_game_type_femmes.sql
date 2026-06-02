-- Sta 'femmes' (Tour de France Femmes) toe als game_type. Femmes hergebruikt het
-- gele Tour-thema (theme = 'geel'), dus de theme-CHECK hoeft niet te wijzigen.
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_game_type_check;
ALTER TABLE public.games ADD CONSTRAINT games_game_type_check
  CHECK (game_type = ANY (ARRAY['giro'::text, 'tour'::text, 'tdf'::text, 'vuelta'::text, 'femmes'::text, 'other'::text]));

-- Backfill: een femmes-game zonder expliciet thema krijgt het gele thema.
UPDATE public.games SET theme = 'geel' WHERE theme IS NULL AND game_type = 'femmes';
