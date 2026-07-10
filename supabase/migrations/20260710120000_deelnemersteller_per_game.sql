-- Homepage-deelnemersteller: per game aan/uit + per-game telling.
--
-- Voorheen telde count_deelnemers() ALLE profielen globaal (nooit gereset) en
-- toonde de teller onvoorwaardelijk vanaf 100. Nu:
--   A) games.deelnemers_teller_visible — admin zet 'm handmatig aan (bv. bij
--      Go-live); default uit, gaat nooit vanzelf aan.
--   B) count_deelnemers_game(game_id) — telt de echte deelnemers van ÉÉN game
--      (ingediend, of concept met minstens één keuze), zodat de teller elke game
--      opnieuw bij nul begint. anon + authenticated (publieke homepage).
-- Idempotent.

alter table public.games
  add column if not exists deelnemers_teller_visible boolean not null default false;

create or replace function public.count_deelnemers_game(p_game_id uuid)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $function$
  select count(distinct e.id)::int
  from public.entries e
  where e.game_id = p_game_id
    and (
      e.status = 'submitted'
      or exists (select 1 from public.entry_picks ep where ep.entry_id = e.id)
    );
$function$;

revoke all on function public.count_deelnemers_game(uuid) from public;
grant execute on function public.count_deelnemers_game(uuid) to anon, authenticated;
