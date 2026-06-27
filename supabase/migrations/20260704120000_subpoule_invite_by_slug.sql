-- Uitnodigingspagina voor niet-ingelogde bezoekers: geeft UITSLUITEND de naam
-- (geen code/ledenlijst/privédata) van een subpoule op basis van de slug.
-- Idempotent. resolve_subpoule_by_slug (incl. code) blijft voor ingelogde flow.
create or replace function public.subpoule_invite_by_slug(p_slug text)
returns table(id uuid, name text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select id, name
  from public.subpoules
  where lower(slug) = lower(p_slug)
  limit 1;
$function$;

revoke all on function public.subpoule_invite_by_slug(text) from public;
grant execute on function public.subpoule_invite_by_slug(text) to anon, authenticated;
