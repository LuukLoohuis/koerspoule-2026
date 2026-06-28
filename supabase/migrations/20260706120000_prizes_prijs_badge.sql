-- Premium prijskaart: opvallende prijsregel + bewerkbare badge. Idempotent.
alter table public.prizes
  add column if not exists prijs_label text,   -- bv. "€10" (groot/goud onder titel)
  add column if not exists badge_top text,     -- bovenregel ronde badge, bv. "Vandaag"
  add column if not exists badge_bottom text;  -- onderregel ronde badge, bv. "Prijs"
