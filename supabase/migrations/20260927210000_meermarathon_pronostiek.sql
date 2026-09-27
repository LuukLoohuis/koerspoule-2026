-- Meermarathon-pronostiek: per peloton de winnaar van het Cup-klassement
-- (kunstijs) en van het Grand Prix-klassement (natuurijs). Wie bij de vrouwen
-- én de mannen meedoet, voorspelt er dus vier.
--
-- Ze staan in entry_predictions, net als de wielervoorspellingen, op
-- position 1. save_entry_predictions hoeft niet te veranderen: die controleert
-- al dat de rijder in deze game rijdt en dat de inschrijving nog open is. Alleen
-- de CHECK op classification liet deze twee soorten niet toe.
--
-- Punten volgen later: calculate_prediction_points rekent alleen gc, points,
-- kom en youth, en slaat cup en grandprix dus over.

ALTER TABLE public.entry_predictions
  DROP CONSTRAINT IF EXISTS entry_predictions_classification_check;
ALTER TABLE public.entry_predictions
  ADD CONSTRAINT entry_predictions_classification_check
  CHECK (classification IN ('gc', 'points', 'kom', 'youth', 'cup', 'grandprix'));

-- Rollback:
--   DELETE FROM public.entry_predictions WHERE classification IN ('cup', 'grandprix');
--   ALTER TABLE public.entry_predictions DROP CONSTRAINT IF EXISTS entry_predictions_classification_check;
--   ALTER TABLE public.entry_predictions ADD CONSTRAINT entry_predictions_classification_check
--     CHECK (classification IN ('gc', 'points', 'kom', 'youth'));
