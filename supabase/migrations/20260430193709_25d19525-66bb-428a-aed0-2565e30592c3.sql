
alter table public.games add column if not exists game_type text default 'giro' check (game_type in ('giro','tour','vuelta','other'));
