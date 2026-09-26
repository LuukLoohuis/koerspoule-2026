-- Meermarathon splitst per seizoen in twee losse games: vrouwen en mannen.
--
-- Elke game houdt zijn eigen schaatsers, wedstrijden, ploegen, subpoules en
-- klassement (alles hangt al aan game_id). Meedoen aan beide is niet
-- verplicht: een inschrijving is per game.
--
-- De unieke index op (game_type, year) liet maar één Meermarathon per seizoen
-- toe; de categorie gaat daarom mee in de sleutel. Wielergames hebben geen
-- categorie en blijven dus één per type per jaar.
--
-- Bestaande Meermarathon-games houden categorie NULL tot de beheerder er in
-- Admin → Games een kiest.

ALTER TABLE public.games ADD COLUMN IF NOT EXISTS categorie text;

ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_categorie_check;
ALTER TABLE public.games ADD CONSTRAINT games_categorie_check
  CHECK (
    categorie IS NULL
    OR (game_type = 'meermarathon' AND categorie = ANY (ARRAY['vrouwen'::text, 'mannen'::text]))
  );

DROP INDEX IF EXISTS public.games_type_year_unique;
CREATE UNIQUE INDEX IF NOT EXISTS games_type_year_unique
  ON public.games (game_type, year, COALESCE(categorie, ''))
  WHERE game_type IS NOT NULL AND year IS NOT NULL;

-- Rollback:
--   DROP INDEX IF EXISTS public.games_type_year_unique;
--   CREATE UNIQUE INDEX games_type_year_unique ON public.games (game_type, year)
--     WHERE game_type IS NOT NULL AND year IS NOT NULL;
--   ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_categorie_check;
--   ALTER TABLE public.games DROP COLUMN IF EXISTS categorie;
