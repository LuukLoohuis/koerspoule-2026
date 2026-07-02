-- Ereplaatsen uitgebreid van 4..10 naar 4..20 (podium dekt 1..3 → totaal t/m 20).
-- Idempotent.
alter table public.prizes drop constraint if exists prizes_rang_check;
alter table public.prizes add constraint prizes_rang_check
  check (
    (soort = 'ereplaats' and rang between 4 and 20)
    or (soort <> 'ereplaats' and rang is null)
  );
