
alter table public.games add column if not exists starts_at timestamptz;
alter table public.games add column if not exists slug text;
create unique index if not exists games_slug_uniq on public.games(slug) where slug is not null;

alter table public.stage_results add column if not exists did_finish boolean;
alter table public.stage_results add column if not exists start_number int;
alter table public.stage_results add column if not exists rider_name text;
alter table public.stage_results add column if not exists game_id uuid references public.games(id) on delete cascade;
