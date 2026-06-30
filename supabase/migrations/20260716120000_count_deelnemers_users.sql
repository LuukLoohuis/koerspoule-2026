-- Teller telt nu GEBRUIKERS (geregistreerde accounts = public.profiles), niet
-- ingediende ploegen. Geeft nog steeds UITSLUITEND een integer terug, geen
-- rij-/persoonsdata. Idempotent (vervangt de vorige definitie).
create or replace function public.count_deelnemers()
returns integer
language sql
stable
security definer
set search_path to 'public'
as $function$
  select count(*)::int from public.profiles;
$function$;

revoke all on function public.count_deelnemers() from public;
grant execute on function public.count_deelnemers() to anon, authenticated;
