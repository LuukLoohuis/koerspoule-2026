-- Perf: leaderboard_global_mv non-concurrent refresh pakt een ACCESS EXCLUSIVE-
-- lock → de publieke /uitslagen stalt heel even tijdens een admin-recalc. De MV
-- heeft een unique index (leaderboard_global_mv_uidx), dus REFRESH CONCURRENTLY
-- kan: oude foto blijft leesbaar tot de nieuwe klaar is. Functie verder identiek.
create or replace function public.update_total_ranking(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  -- Voorgerekende globale stand verversen — CONCURRENTLY zodat lezers van de
  -- publieke /uitslagen niet blokkeren tijdens de refresh.
  refresh materialized view concurrently public.leaderboard_global_mv;
end $function$;
