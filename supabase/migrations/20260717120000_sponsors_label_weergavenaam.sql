-- Footer-sponsorkaartjes kunnen logo OF tekst tonen: klein kapitaaltje (label,
-- bv. "Wij geven") + grote weergavenaam (bv. "LICHT"). Idempotent.
alter table public.sponsors
  add column if not exists label text,
  add column if not exists weergavenaam text;
