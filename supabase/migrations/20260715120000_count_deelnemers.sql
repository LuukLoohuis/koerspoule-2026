-- Veilige publieke teller voor sociaal bewijs op de homepage: geeft UITSLUITEND
-- het AANTAL ingediende ploegen terug (entries.status='submitted'), nooit rij- of
-- persoonsdata. SECURITY DEFINER zodat anon niet rechtstreeks op entries hoeft.
-- Idempotent.
create or replace function public.count_deelnemers()
returns integer
language sql
stable
security definer
set search_path to 'public'
as $function$
  select count(*)::int from public.entries where status = 'submitted';
$function$;

revoke all on function public.count_deelnemers() from public;
grant execute on function public.count_deelnemers() to anon, authenticated;
