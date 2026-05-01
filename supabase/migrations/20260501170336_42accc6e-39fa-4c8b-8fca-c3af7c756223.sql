-- Deduplicate existing data first to allow unique indexes.
-- Riders: keep oldest per (game_id, start_number)
delete from public.riders r
using public.riders r2
where r.game_id is not null
  and r.start_number is not null
  and r.game_id = r2.game_id
  and r.start_number = r2.start_number
  and r.created_at > r2.created_at;

-- Teams: keep oldest per (game_id, name)
delete from public.teams t
using public.teams t2
where t.game_id is not null
  and t.game_id = t2.game_id
  and t.name = t2.name
  and t.created_at > t2.created_at;

create unique index if not exists riders_game_startnum_uniq
  on public.riders(game_id, start_number)
  where game_id is not null and start_number is not null;

create unique index if not exists teams_game_name_uniq
  on public.teams(game_id, name)
  where game_id is not null;