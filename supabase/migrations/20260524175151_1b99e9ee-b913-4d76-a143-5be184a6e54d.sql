ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS theme text
  CHECK (theme IS NULL OR theme IN ('roze', 'geel', 'rood'));

UPDATE public.games SET theme = 'roze'  WHERE theme IS NULL AND game_type = 'giro';
UPDATE public.games SET theme = 'geel'  WHERE theme IS NULL AND game_type IN ('tdf', 'tour');
UPDATE public.games SET theme = 'rood'  WHERE theme IS NULL AND game_type = 'vuelta';