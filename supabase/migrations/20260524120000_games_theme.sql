-- ============================================
-- Thema per game: roze (Giro) / geel (Tour) / rood (Vuelta).
-- Nullable; bij leeg valt de frontend terug op game_type.
-- ============================================

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS theme text
  CHECK (theme IS NULL OR theme IN ('roze', 'geel', 'rood'));

-- Backfill op basis van bestaand game_type (best effort)
UPDATE public.games SET theme = 'roze'  WHERE theme IS NULL AND game_type = 'giro';
UPDATE public.games SET theme = 'geel'  WHERE theme IS NULL AND game_type IN ('tdf', 'tour');
UPDATE public.games SET theme = 'rood'  WHERE theme IS NULL AND game_type = 'vuelta';
