ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_game_type_check;
ALTER TABLE public.games ADD CONSTRAINT games_game_type_check
  CHECK (game_type = ANY (ARRAY['giro'::text, 'tour'::text, 'tdf'::text, 'vuelta'::text, 'other'::text]));
UPDATE public.games SET game_type = 'tdf' WHERE game_type = 'tour';