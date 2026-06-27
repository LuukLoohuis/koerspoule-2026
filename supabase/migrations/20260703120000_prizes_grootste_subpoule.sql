-- Extra prijs-soort: 'grootste_subpoule'. Idempotent.
alter table public.prizes drop constraint if exists prizes_soort_check;
alter table public.prizes add constraint prizes_soort_check
  check (soort in ('podium_1','podium_2','podium_3','dagprijs','ereplaats','grootste_subpoule'));
