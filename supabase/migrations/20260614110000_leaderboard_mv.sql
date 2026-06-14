-- ───────────────────────────────────────────────────────────────────────────
-- Voorgerekende globale stand (materialized view) — i.p.v. per request een
-- live rank() over alle entries. Ververst automatisch ná elke herberekening
-- (update_total_ranking). Leest entries.total_points (authoritative; wordt door
-- update_total_ranking bijgewerkt, incl. voorspellingspunten).
-- Idempotent (if not exists / or replace). Geen data gewijzigd/verwijderd.
-- ───────────────────────────────────────────────────────────────────────────

-- 1) Materialized view met voorgerekende rang.
create materialized view if not exists public.leaderboard_global_mv as
select
  e.id        as entry_id,
  e.game_id,
  e.user_id,
  e.team_name,
  coalesce(e.total_points, 0) as total_points,
  rank() over (partition by e.game_id order by coalesce(e.total_points, 0) desc) as rank
from public.entries e
where e.status = 'submitted';

create unique index if not exists leaderboard_global_mv_uidx
  on public.leaderboard_global_mv(entry_id);
create index if not exists leaderboard_global_mv_game_idx
  on public.leaderboard_global_mv(game_id, rank);

-- 2) Refresh-haak: ververs de MV aan het EIND van update_total_ranking, zodat de
--    globale stand klopt na elke etappe-herberekening/fiattering. Niet-concurrent
--    (admin-actie, sub-seconde bij deze omvang). Exacte body van de huidige functie
--    + de refresh-regel.
create or replace function public.update_total_ranking(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;

  insert into public.total_points(entry_id, total_points, updated_at)
  select
    e.id,
    (
      coalesce((select sum(sp.points)
                  from public.stage_points sp
                  join public.stages s on s.id = sp.stage_id
                 where sp.entry_id = e.id and s.game_id = p_game_id), 0)
      +
      coalesce((select sum(epp.points)
                  from public.entry_prediction_points epp
                 where epp.entry_id = e.id), 0)
    )::int,
    now()
  from public.entries e
  where e.game_id = p_game_id
  on conflict (entry_id) do update
    set total_points = excluded.total_points, updated_at = now();

  update public.entries e
  set total_points = coalesce(tp.total_points, 0)
  from public.total_points tp
  where tp.entry_id = e.id and e.game_id = p_game_id;

  -- Voorgerekende globale stand verversen.
  refresh materialized view public.leaderboard_global_mv;
end $$;

-- 3) Lees-RPC (SECURITY DEFINER — een MV omzeilt RLS; globale stand is binnen een
--    game zichtbaar voor deelnemers).
create or replace function public.get_game_leaderboard(p_game_id uuid)
returns table(entry_id uuid, user_id uuid, team_name text, total_points int, rank int)
language sql
security definer
set search_path = public
stable
as $$
  select entry_id, user_id, team_name, total_points, rank
  from public.leaderboard_global_mv
  where game_id = p_game_id
  order by rank;
$$;

grant execute on function public.get_game_leaderboard(uuid) to authenticated, service_role;
