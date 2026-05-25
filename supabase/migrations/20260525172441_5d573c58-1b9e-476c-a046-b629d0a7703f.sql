-- 20260525120000_stages_profile_image (idempotent)
ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS profile_image_url text;

-- 20260524120000_games_theme (idempotent)
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS theme text;

DO $$ BEGIN
  ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_theme_check;
  ALTER TABLE public.games ADD CONSTRAINT games_theme_check
    CHECK (theme IS NULL OR theme IN ('roze','geel','rood'));
END $$;

UPDATE public.games SET theme = CASE
  WHEN game_type = 'giro' THEN 'roze'
  WHEN game_type IN ('tdf','tour') THEN 'geel'
  WHEN game_type = 'vuelta' THEN 'rood'
  ELSE theme
END
WHERE theme IS NULL;