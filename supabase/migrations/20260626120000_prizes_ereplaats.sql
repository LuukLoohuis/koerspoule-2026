-- Ereplaatsen 4..10: nieuwe soort 'ereplaats' + nullable rang-kolom. Idempotent.
alter table public.prizes
  add column if not exists rang int;

alter table public.prizes drop constraint if exists prizes_soort_check;
alter table public.prizes add constraint prizes_soort_check
  check (soort in ('podium_1','podium_2','podium_3','dagprijs','ereplaats'));

-- rang alleen zinvol bij ereplaats (4..10); anders null.
alter table public.prizes drop constraint if exists prizes_rang_check;
alter table public.prizes add constraint prizes_rang_check
  check (
    (soort = 'ereplaats' and rang between 4 and 10)
    or (soort <> 'ereplaats' and rang is null)
  );
