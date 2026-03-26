-- Seed/import script for Tour de France 2025 start list.
-- Extend this list with the full parsed dataset when needed.
-- Safe to re-run.

with upsert_game as (
  insert into public.games (name, year, status)
  values ('Tour de France', 2025, 'open')
  on conflict (year, name) do update set status = excluded.status
  returning id
),
game_row as (
  select id from upsert_game
  union all
  select id from public.games where name = 'Tour de France' and year = 2025 limit 1
)
insert into public.teams (game_id, name, short_name)
select g.id, t.name, t.short_name
from game_row g
cross join (
  values
    ('UAE Team Emirates - XRG', 'UAE'),
    ('Team Visma | Lease a Bike', 'TVL'),
    ('Soudal Quick-Step', 'SOQ'),
    ('Alpecin - Deceuninck', 'ADC'),
    ('INEOS Grenadiers', 'IGD')
) as t(name, short_name)
on conflict (game_id, name) do update set short_name = excluded.short_name;

insert into public.riders (team_id, name, start_number)
select tm.id, rr.name, rr.start_number
from public.teams tm
join public.games g on g.id = tm.game_id
join (
  values
    ('UAE Team Emirates - XRG', 'Tadej Pogacar', 1),
    ('UAE Team Emirates - XRG', 'Joao Almeida', 2),
    ('Team Visma | Lease a Bike', 'Jonas Vingegaard', 11),
    ('Team Visma | Lease a Bike', 'Wout van Aert', 17),
    ('Soudal Quick-Step', 'Remco Evenepoel', 21),
    ('Alpecin - Deceuninck', 'Jasper Philipsen', 105),
    ('INEOS Grenadiers', 'Carlos Rodriguez', 61),
    ('INEOS Grenadiers', 'Geraint Thomas', 67)
) as rr(team_name, name, start_number)
  on rr.team_name = tm.name
where g.name = 'Tour de France' and g.year = 2025
on conflict (team_id, start_number) do update set name = excluded.name;
