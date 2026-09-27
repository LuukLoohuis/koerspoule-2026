-- De Meermarathon kent geen jokers.
--
-- Een wielerploeg kiest naast de categorieën twee jokers; bij de Meermarathon
-- is je ploeg precies wat je in de categorieën kiest. De teambouwer bood de
-- jokers toch aan zodra er rijders buiten de categorieën op de startlijst
-- stonden, en de puntentelling (calculate_stage_scores en
-- calculate_stage_scores_batch) telt elke joker mee.
--
-- Deze trigger weigert jokers in een Meermarathon-game, langs welke route ook:
-- save_entry_jokers, het beheer, of rechtstreeks (de RLS-policy
-- entry_jokers_modify laat de eigenaar zelf schrijven).
--
-- Jokers die al in een Meermarathon-ploeg staan, laat deze migratie staan; die
-- tellen mee tot ze weg zijn. Of er zulke jokers zijn:
--   SELECT g.name, count(*)
--   FROM public.entry_jokers ej
--   JOIN public.entries e ON e.id = ej.entry_id
--   JOIN public.games g ON g.id = e.game_id
--   WHERE g.game_type = 'meermarathon'
--   GROUP BY g.name;
--
-- Idempotent.

CREATE OR REPLACE FUNCTION public.weiger_jokers_meermarathon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.entries e
    JOIN public.games g ON g.id = e.game_id
    WHERE e.id = NEW.entry_id
      AND g.game_type = 'meermarathon'
  ) THEN
    RAISE EXCEPTION 'De Meermarathon kent geen jokers.'
      USING errcode = '22023';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_geen_jokers_meermarathon ON public.entry_jokers;
CREATE TRIGGER trg_geen_jokers_meermarathon
  BEFORE INSERT OR UPDATE ON public.entry_jokers
  FOR EACH ROW EXECUTE FUNCTION public.weiger_jokers_meermarathon();

-- Rollback:
--   DROP TRIGGER IF EXISTS trg_geen_jokers_meermarathon ON public.entry_jokers;
--   DROP FUNCTION IF EXISTS public.weiger_jokers_meermarathon();
