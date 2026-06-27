-- Tijdelijke werving van een subpoule op de homepage. Idempotent.
-- Nieuwe vlag (geen bestaande past: banner_enabled = sponsorbanner in Mijn Peloton,
-- een andere context). promote_text = optionele wervingstekst.
alter table public.subpoules
  add column if not exists promote_on_landing boolean not null default false;
alter table public.subpoules
  add column if not exists promote_text text;

-- De homepage is publiek (ook uitgelogd). De RLS op subpoules staat alleen
-- owner/admin/leden toe — dus géén directe SELECT voor de wervingsstrook.
-- SECURITY DEFINER-RPC geeft UITSLUITEND de werving-velden terug (naam, code,
-- tekst) van subpoules met promote_on_landing=true. Geen owner_user_id/privédata.
create or replace function public.get_promoted_subpoules()
returns table(name text, code text, promote_text text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select s.name, s.code, s.promote_text
  from public.subpoules s
  where s.promote_on_landing = true
  order by s.created_at desc;
$function$;

revoke all on function public.get_promoted_subpoules() from public;
grant execute on function public.get_promoted_subpoules() to anon, authenticated;
