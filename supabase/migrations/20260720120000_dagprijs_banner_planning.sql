-- Dagprijs-banner per etappe inplannen. Eén banner per etappe (unique stage_id).
-- Planning heeft voorrang; is_dagprijs_vandaag blijft als terugval bestaan.
-- Idempotent.
create table if not exists public.dagprijs_banner_planning (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  stage_id uuid not null references public.stages(id) on delete cascade,
  prize_id uuid not null references public.prizes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (stage_id)
);
create index if not exists dbp_game_idx on public.dagprijs_banner_planning (game_id);

alter table public.dagprijs_banner_planning enable row level security;

drop policy if exists dbp_read on public.dagprijs_banner_planning;
create policy dbp_read on public.dagprijs_banner_planning for select using (true);

drop policy if exists dbp_admin_write on public.dagprijs_banner_planning;
create policy dbp_admin_write on public.dagprijs_banner_planning
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.dagprijs_banner_planning to anon;
grant select, insert, update, delete on public.dagprijs_banner_planning to authenticated;
grant all on public.dagprijs_banner_planning to service_role;

-- Welke banner toont L'Équipe vandaag? Prioriteit:
--   1) de dagprijs die voor de etappe-van-vandaag is ingepland (etappedatum =
--      vandaag, tijdzone Europe/Amsterdam → rustdag/geen-etappe = geen match);
--   2) terugval op de dagprijs met is_dagprijs_vandaag=true;
--   3) niets (lege result).
-- Geeft alleen de publieke bannervelden terug, geen privédata.
create or replace function public.get_dagprijs_banner(p_game_id uuid)
returns table (
  titel text,
  sponsor_naam text,
  sponsor_logo_url text,
  sponsor_url text,
  banner_kicker text,
  banner_sponsor_label text,
  banner_waarde text
)
language sql stable security definer set search_path = public as $$
  with vandaag as (
    select p.titel, p.sponsor_naam, p.sponsor_logo_url, p.sponsor_url,
           p.banner_kicker, p.banner_sponsor_label, p.banner_waarde
    from public.dagprijs_banner_planning pl
    join public.stages s on s.id = pl.stage_id
    join public.prizes p on p.id = pl.prize_id
    where pl.game_id = p_game_id
      and s.date = (now() at time zone 'Europe/Amsterdam')::date
    limit 1
  ),
  terugval as (
    select p.titel, p.sponsor_naam, p.sponsor_logo_url, p.sponsor_url,
           p.banner_kicker, p.banner_sponsor_label, p.banner_waarde
    from public.prizes p
    where p.game_id = p_game_id and p.is_dagprijs_vandaag = true
    limit 1
  )
  select * from vandaag
  union all
  select * from terugval where not exists (select 1 from vandaag)
  limit 1;
$$;

revoke all on function public.get_dagprijs_banner(uuid) from public;
grant execute on function public.get_dagprijs_banner(uuid) to anon, authenticated;
