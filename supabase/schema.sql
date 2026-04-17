-- ============================================================
-- CYCLING POOL - COMPLETE BACKEND SCHEMA
-- Paste in Supabase SQL Editor (or save as a migration on your side)
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
do $$ begin
  create type public.app_role as enum ('user','admin');
exception when duplicate_object then null; end $$;

-- ============================================================
-- USER ROLES (separate table -> avoids privilege escalation)
-- ============================================================
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin');
$$;

-- ============================================================
-- CORE TABLES
-- ============================================================

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  unique(game_id, name)
);

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team text,
  created_at timestamptz not null default now()
);

create index if not exists riders_name_idx on public.riders(name);

-- Start list: which riders are in this game, optionally tied to a category
create table if not exists public.game_riders (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(game_id, rider_id)
);

create index if not exists game_riders_game_idx on public.game_riders(game_id);
create index if not exists game_riders_category_idx on public.game_riders(category_id);

-- ============================================================
-- USER TEAMS + PICKS
-- ============================================================

create table if not exists public.user_teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  name text,
  created_at timestamptz not null default now(),
  unique(user_id, game_id)
);

create table if not exists public.team_picks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.user_teams(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  is_joker boolean not null default false,
  created_at timestamptz not null default now()
);

-- HARD CONSTRAINTS (enforced in DB):
-- 1) No duplicate rider per team (joker or pick share uniqueness)
create unique index if not exists team_picks_unique_rider
  on public.team_picks(team_id, rider_id);

-- 2) Exactly one pick per (team, category) for non-joker picks
create unique index if not exists team_picks_unique_category
  on public.team_picks(team_id, category_id)
  where is_joker = false;

-- 3) Jokers have category_id NULL; category picks must have category_id
alter table public.team_picks
  drop constraint if exists team_picks_joker_check;
alter table public.team_picks
  add constraint team_picks_joker_check
  check (
    (is_joker = true  and category_id is null) or
    (is_joker = false and category_id is not null)
  );

create index if not exists team_picks_team_idx on public.team_picks(team_id);

-- ============================================================
-- STAGES + RESULTS + POINTS SCHEMA
-- ============================================================

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  stage_number int not null,
  date date,
  created_at timestamptz not null default now(),
  unique(game_id, stage_number)
);

create table if not exists public.stage_results (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  position int not null,
  created_at timestamptz not null default now(),
  unique(stage_id, position),
  unique(stage_id, rider_id)
);

create index if not exists stage_results_stage_idx on public.stage_results(stage_id);

create table if not exists public.points_schema (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  position int not null,
  points int not null,
  unique(game_id, position)
);

-- ============================================================
-- CALCULATED POINTS
-- ============================================================

create table if not exists public.stage_points (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  team_id uuid not null references public.user_teams(id) on delete cascade,
  points int not null default 0,
  created_at timestamptz not null default now(),
  unique(stage_id, team_id)
);

create index if not exists stage_points_team_idx on public.stage_points(team_id);

create table if not exists public.total_points (
  team_id uuid primary key references public.user_teams(id) on delete cascade,
  total_points int not null default 0,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- RLS
-- ============================================================
alter table public.games           enable row level security;
alter table public.categories      enable row level security;
alter table public.riders          enable row level security;
alter table public.game_riders     enable row level security;
alter table public.user_teams      enable row level security;
alter table public.team_picks      enable row level security;
alter table public.stages          enable row level security;
alter table public.stage_results   enable row level security;
alter table public.points_schema   enable row level security;
alter table public.stage_points    enable row level security;
alter table public.total_points    enable row level security;

-- Public-readable reference data (any authenticated user); admins can write
do $$
declare t text;
begin
  foreach t in array array[
    'games','categories','riders','game_riders',
    'stages','stage_results','points_schema',
    'stage_points','total_points'
  ]
  loop
    execute format('drop policy if exists "read_%s" on public.%I', t, t);
    execute format('create policy "read_%s" on public.%I for select using (auth.uid() is not null)', t, t);

    execute format('drop policy if exists "admin_write_%s" on public.%I', t, t);
    execute format('create policy "admin_write_%s" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- user_teams: owner or admin
drop policy if exists "user_teams_select" on public.user_teams;
create policy "user_teams_select" on public.user_teams
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "user_teams_modify" on public.user_teams;
create policy "user_teams_modify" on public.user_teams
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- team_picks: through ownership of team
drop policy if exists "team_picks_select" on public.team_picks;
create policy "team_picks_select" on public.team_picks
  for select using (
    exists(select 1 from public.user_teams t
           where t.id = team_id and (t.user_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "team_picks_modify" on public.team_picks;
create policy "team_picks_modify" on public.team_picks
  for all using (
    exists(select 1 from public.user_teams t
           where t.id = team_id and (t.user_id = auth.uid() or public.is_admin()))
  ) with check (
    exists(select 1 from public.user_teams t
           where t.id = team_id and (t.user_id = auth.uid() or public.is_admin()))
  );

-- user_roles: users read own role; only admins write
drop policy if exists "user_roles_select_self" on public.user_roles;
create policy "user_roles_select_self" on public.user_roles
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "user_roles_admin_write" on public.user_roles;
create policy "user_roles_admin_write" on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- AUTO-CREATE BASE ROLE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles(user_id, role)
  values (new.id, 'user')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RPC: import_stage_results(stage_id, results jsonb)
-- results = [{ "rider_id": "...", "position": 1 }, ...]
-- ============================================================
create or replace function public.import_stage_results(
  p_stage_id uuid,
  p_results  jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  delete from public.stage_results where stage_id = p_stage_id;

  insert into public.stage_results(stage_id, rider_id, position)
  select p_stage_id,
         (r->>'rider_id')::uuid,
         (r->>'position')::int
  from jsonb_array_elements(p_results) r;
end $$;

-- ============================================================
-- RPC: calculate_stage_points(stage_id)   -- joker = 2x
-- ============================================================
create or replace function public.calculate_stage_points(p_stage_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select game_id into v_game_id from public.stages where id = p_stage_id;
  if v_game_id is null then
    raise exception 'Stage not found';
  end if;

  delete from public.stage_points where stage_id = p_stage_id;

  insert into public.stage_points(stage_id, team_id, points)
  select
    p_stage_id,
    tp.team_id,
    coalesce(sum(ps.points * case when tp.is_joker then 2 else 1 end), 0)::int as points
  from public.stage_results sr
  join public.points_schema  ps
    on ps.game_id = v_game_id and ps.position = sr.position
  join public.team_picks     tp on tp.rider_id = sr.rider_id
  join public.user_teams     ut on ut.id = tp.team_id and ut.game_id = v_game_id
  group by tp.team_id;
end $$;

-- ============================================================
-- RPC: update_total_ranking(game_id)
-- ============================================================
create or replace function public.update_total_ranking(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  insert into public.total_points(team_id, total_points, updated_at)
  select ut.id,
         coalesce(sum(sp.points), 0)::int,
         now()
  from public.user_teams ut
  left join public.stage_points sp on sp.team_id = ut.id
  left join public.stages s        on s.id = sp.stage_id and s.game_id = p_game_id
  where ut.game_id = p_game_id
  group by ut.id
  on conflict (team_id)
  do update set total_points = excluded.total_points, updated_at = now();
end $$;

-- ============================================================
-- RPC: full_recalculation(game_id)
-- ============================================================
create or replace function public.full_recalculation(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  delete from public.stage_points
   where stage_id in (select id from public.stages where game_id = p_game_id);

  delete from public.total_points
   where team_id in (select id from public.user_teams where game_id = p_game_id);

  for v_stage_id in select id from public.stages where game_id = p_game_id loop
    perform public.calculate_stage_points(v_stage_id);
  end loop;

  perform public.update_total_ranking(p_game_id);
end $$;

-- ============================================================
-- RPC: reset_stage_results(stage_id)
-- ============================================================
create or replace function public.reset_stage_results(p_stage_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_game_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  select game_id into v_game_id from public.stages where id = p_stage_id;

  delete from public.stage_results where stage_id = p_stage_id;
  delete from public.stage_points  where stage_id = p_stage_id;

  if v_game_id is not null then
    perform public.update_total_ranking(v_game_id);
  end if;
end $$;
