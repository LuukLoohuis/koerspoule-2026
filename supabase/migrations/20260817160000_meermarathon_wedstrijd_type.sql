-- Meermarathon rijdt geen etappes maar losse wedstrijden, en de maat verschilt
-- per ondergrond.
--
-- Soorten:
--   cup        kunstijs, doorlopend genummerd (Cup 1, Cup 2, …)
--   grandprix  natuurijs, doorlopend genummerd (Grand Prix 3, …)
--   onk        losse titelwedstrijd, geen nummer
--   nk         losse titelwedstrijd, geen nummer
--
-- Maat: op kunstijs telt het aantal ronden, op natuurijs de afstand in
-- kilometers. Daarom een eigen kolom naast het bestaande distance_km in plaats
-- van dat veld te overladen — anders weet je bij een getal niet meer of het om
-- ronden of kilometers gaat.

ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS wedstrijd_type text;

ALTER TABLE public.stages
  DROP CONSTRAINT IF EXISTS stages_wedstrijd_type_check;
ALTER TABLE public.stages
  ADD CONSTRAINT stages_wedstrijd_type_check
  CHECK (wedstrijd_type IS NULL OR wedstrijd_type IN ('cup', 'grandprix', 'onk', 'nk'));

ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS aantal_rondes integer;

ALTER TABLE public.stages
  DROP CONSTRAINT IF EXISTS stages_aantal_rondes_check;
ALTER TABLE public.stages
  ADD CONSTRAINT stages_aantal_rondes_check
  CHECK (aantal_rondes IS NULL OR aantal_rondes > 0);

COMMENT ON COLUMN public.stages.wedstrijd_type IS
  'Meermarathon: cup | grandprix | onk | nk. Bepaalt hoe de wedstrijd heet.';
COMMENT ON COLUMN public.stages.aantal_rondes IS
  'Meermarathon kunstijs: aantal te rijden ronden. Natuurijs gebruikt distance_km.';

-- Rollback:
--   ALTER TABLE public.stages DROP COLUMN wedstrijd_type, DROP COLUMN aantal_rondes;
