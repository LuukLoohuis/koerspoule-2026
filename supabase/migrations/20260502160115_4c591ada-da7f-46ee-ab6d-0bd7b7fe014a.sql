-- Verwijder oude UNIQUE-constraint die maar 1 pick per categorie toestond.
ALTER TABLE public.entry_picks DROP CONSTRAINT IF EXISTS entry_picks_entry_id_category_id_key;

-- Voorkom dezelfde renner dubbel in dezelfde categorie
ALTER TABLE public.entry_picks
  ADD CONSTRAINT entry_picks_entry_category_rider_unique
  UNIQUE (entry_id, category_id, rider_id);