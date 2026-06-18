-- KOERSPOULE — VOLLEDIGE DB-OPZET (schone Supabase)
-- Gegenereerd door supabase/build_setup.py.
-- Basis 20260430193546 + compat + overige migraties (chronologisch).
-- Uit: schema.sql + 4 cron-jobs. Fixes: backend_v4 team_id->entry_id,
-- admin_v3 game_type->text, views drop+recreate.

-- ########## PREP: schema-rechten (Supabase-defaults) ##########
-- Na 'drop schema public cascade; create schema public' zijn de standaard-
-- grants weg. Zonder deze geeft PostgREST 403 op alle tabellen. RLS blijft
-- de rijen beschermen. Default privileges gelden voor tabellen die hierna
-- worden aangemaakt.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

-- ########## BASIS ##########


-- ============================================================
-- KOERSPOULE - COMPLETE BACKEND SCHEMA
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
do $$ begin
  create type public.app_role as enum ('user','admin');
exception when duplicate_object then null; end $$;

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ============================================================
-- USER_ROLES (separate, anti-privilege-escalation)
-- ============================================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin');
$$;

-- ============================================================
-- GAMES
-- ============================================================
create table public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year int not null,
  status text not null default 'draft' check (status in ('draft','open','locked','live','finished')),
  start_date date,
  end_date date,
  deadline timestamptz,
  created_at timestamptz not null default now()
);
alter table public.games enable row level security;

-- ============================================================
-- TEAMS (wielerploegen)
-- ============================================================
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete cascade,
  name text not null,
  short_name text,
  country_code text,
  created_at timestamptz not null default now()
);
alter table public.teams enable row level security;

-- ============================================================
-- RIDERS
-- ============================================================
create table public.riders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_id uuid references public.teams(id) on delete set null,
  start_number int,
  country_code text,
  created_at timestamptz not null default now()
);
create index riders_team_idx on public.riders(team_id);
create index riders_name_idx on public.riders(name);
alter table public.riders enable row level security;

-- ============================================================
-- CATEGORIES
-- ============================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null,
  short_name text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique(game_id, name)
);
alter table public.categories enable row level security;

-- ============================================================
-- CATEGORY_RIDERS (which riders belong to which category)
-- ============================================================
create table public.category_riders (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(category_id, rider_id)
);
create index category_riders_cat_idx on public.category_riders(category_id);
create index category_riders_rider_idx on public.category_riders(rider_id);
alter table public.category_riders enable row level security;

-- ============================================================
-- GAME_RIDERS (startlist for a game)
-- ============================================================
create table public.game_riders (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(game_id, rider_id)
);
alter table public.game_riders enable row level security;

-- ============================================================
-- STARTLISTS (snapshots of imports)
-- ============================================================
create table public.startlists (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  source text,
  imported_at timestamptz not null default now(),
  raw jsonb
);
alter table public.startlists enable row level security;

-- ============================================================
-- ENTRIES
-- ============================================================
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  team_name text,
  status text not null default 'draft' check (status in ('draft','submitted')),
  submitted_at timestamptz,
  total_points int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, game_id)
);
create index entries_game_idx on public.entries(game_id);
create index entries_user_idx on public.entries(user_id);
alter table public.entries enable row level security;

create table public.entry_picks (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(entry_id, category_id),
  unique(entry_id, rider_id)
);
alter table public.entry_picks enable row level security;

create table public.entry_jokers (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(entry_id, rider_id)
);
alter table public.entry_jokers enable row level security;

-- ============================================================
-- STAGES + RESULTS
-- ============================================================
create table public.stages (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  stage_number int not null,
  name text,
  date date,
  status text default 'draft',
  created_at timestamptz not null default now(),
  unique(game_id, stage_number)
);
alter table public.stages enable row level security;

create table public.stage_results (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  finish_position int,
  gc_position int,
  mountain_position int,
  points_position int,
  youth_position int,
  created_at timestamptz not null default now(),
  unique(stage_id, rider_id)
);
create index stage_results_stage_idx on public.stage_results(stage_id);
alter table public.stage_results enable row level security;

-- ============================================================
-- POINTS_SCHEMA + CALCULATED POINTS
-- ============================================================
create table public.points_schema (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  classification text not null check (classification in ('stage','gc','kom','points','youth')),
  position int not null,
  points int not null,
  unique(game_id, classification, position)
);
alter table public.points_schema enable row level security;

create table public.stage_points (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  entry_id uuid not null references public.entries(id) on delete cascade,
  points int not null default 0,
  created_at timestamptz not null default now(),
  unique(stage_id, entry_id)
);
alter table public.stage_points enable row level security;

create table public.total_points (
  entry_id uuid primary key references public.entries(id) on delete cascade,
  total_points int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.total_points enable row level security;

-- ============================================================
-- SUBPOULES
-- ============================================================
create table public.subpoules (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null,
  code text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(game_id, name)
);
alter table public.subpoules enable row level security;

create table public.subpoule_members (
  id uuid primary key default gen_random_uuid(),
  subpoule_id uuid not null references public.subpoules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(subpoule_id, user_id)
);
alter table public.subpoule_members enable row level security;

-- ============================================================
-- TRIGGERS
-- ============================================================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger trg_entries_updated_at before update on public.entries
  for each row execute function public.tg_set_updated_at();
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- Profile + role auto-create on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, 'user') on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- user_roles
drop policy if exists "user_roles_select_self" on public.user_roles;
create policy "user_roles_select_self" on public.user_roles for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "user_roles_admin_write" on public.user_roles;
create policy "user_roles_admin_write" on public.user_roles for all using (public.is_admin()) with check (public.is_admin());

-- Public-readable reference data; admin write
do $$ declare t text;
begin
  foreach t in array array['games','teams','riders','categories','category_riders','game_riders','startlists','stages','stage_results','points_schema','stage_points','total_points']
  loop
    execute format('create policy "read_%s" on public.%I for select using (auth.uid() is not null)', t, t);
    execute format('create policy "admin_write_%s" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- entries
drop policy if exists "entries_select_own_or_admin" on public.entries;
create policy "entries_select_own_or_admin" on public.entries for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "entries_modify_own" on public.entries;
create policy "entries_modify_own" on public.entries for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

-- entry_picks via entry ownership
drop policy if exists "entry_picks_select" on public.entry_picks;
create policy "entry_picks_select" on public.entry_picks for select using (
  exists(select 1 from public.entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_admin()))
);
drop policy if exists "entry_picks_modify" on public.entry_picks;
create policy "entry_picks_modify" on public.entry_picks for all using (
  exists(select 1 from public.entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_admin()))
) with check (
  exists(select 1 from public.entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_admin()))
);

drop policy if exists "entry_jokers_select" on public.entry_jokers;
create policy "entry_jokers_select" on public.entry_jokers for select using (
  exists(select 1 from public.entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_admin()))
);
drop policy if exists "entry_jokers_modify" on public.entry_jokers;
create policy "entry_jokers_modify" on public.entry_jokers for all using (
  exists(select 1 from public.entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_admin()))
) with check (
  exists(select 1 from public.entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_admin()))
);

-- subpoules: members + owner can read; owner+admin can write
drop policy if exists "subpoules_select" on public.subpoules;
create policy "subpoules_select" on public.subpoules for select using (
  owner_user_id = auth.uid()
  or public.is_admin()
  or exists(select 1 from public.subpoule_members m where m.subpoule_id = id and m.user_id = auth.uid())
);
drop policy if exists "subpoules_insert_self" on public.subpoules;
create policy "subpoules_insert_self" on public.subpoules for insert with check (owner_user_id = auth.uid());
drop policy if exists "subpoules_update_owner" on public.subpoules;
create policy "subpoules_update_owner" on public.subpoules for update using (owner_user_id = auth.uid() or public.is_admin());
drop policy if exists "subpoules_delete_owner" on public.subpoules;
create policy "subpoules_delete_owner" on public.subpoules for delete using (owner_user_id = auth.uid() or public.is_admin());

drop policy if exists "subpoule_members_select" on public.subpoule_members;
create policy "subpoule_members_select" on public.subpoule_members for select using (
  user_id = auth.uid() or public.is_admin()
  or exists(select 1 from public.subpoules s where s.id = subpoule_id and s.owner_user_id = auth.uid())
);
drop policy if exists "subpoule_members_insert_self" on public.subpoule_members;
create policy "subpoule_members_insert_self" on public.subpoule_members for insert with check (user_id = auth.uid());
drop policy if exists "subpoule_members_delete_self" on public.subpoule_members;
create policy "subpoule_members_delete_self" on public.subpoule_members for delete using (user_id = auth.uid() or public.is_admin()
  or exists(select 1 from public.subpoules s where s.id = subpoule_id and s.owner_user_id = auth.uid()));

-- ============================================================
-- RPC: save_entry_pick
-- ============================================================
create or replace function public.save_entry_pick(p_entry_id uuid, p_category_id uuid, p_rider_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_status text;
begin
  select user_id, status into v_user, v_status from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;
  if v_status = 'submitted' and not public.is_admin() then raise exception 'Entry already submitted'; end if;

  -- Validate rider belongs to category
  if not exists(select 1 from public.category_riders where category_id = p_category_id and rider_id = p_rider_id) then
    raise exception 'Rider does not belong to this category';
  end if;

  delete from public.entry_picks where entry_id = p_entry_id and category_id = p_category_id;
  insert into public.entry_picks (entry_id, category_id, rider_id) values (p_entry_id, p_category_id, p_rider_id);
end $$;

-- ============================================================
-- RPC: save_entry_jokers (max 2, must be unique)
-- ============================================================
create or replace function public.save_entry_jokers(p_entry_id uuid, p_rider_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_status text;
begin
  select user_id, status into v_user, v_status from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;
  if v_status = 'submitted' and not public.is_admin() then raise exception 'Entry already submitted'; end if;
  if array_length(p_rider_ids,1) > 2 then raise exception 'Maximum 2 jokers'; end if;

  delete from public.entry_jokers where entry_id = p_entry_id;
  if p_rider_ids is not null and array_length(p_rider_ids,1) > 0 then
    insert into public.entry_jokers (entry_id, rider_id)
    select p_entry_id, unnest(p_rider_ids);
  end if;
end $$;

-- ============================================================
-- RPC: submit_entry
-- ============================================================
create or replace function public.submit_entry(p_entry_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_game uuid; v_cat_count int; v_pick_count int;
begin
  select user_id, game_id into v_user, v_game from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;

  select count(*) into v_cat_count from public.categories where game_id = v_game;
  select count(*) into v_pick_count from public.entry_picks where entry_id = p_entry_id;
  if v_pick_count <> v_cat_count then
    raise exception 'Niet alle categorieën zijn ingevuld (% van %)', v_pick_count, v_cat_count;
  end if;

  update public.entries set status = 'submitted', submitted_at = now() where id = p_entry_id;
end $$;

-- ============================================================
-- RPC: assign_admin_role
-- ============================================================
create or replace function public.assign_admin_role(p_user_id uuid, p_make_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_make_admin then
    insert into public.user_roles(user_id, role) values (p_user_id, 'admin') on conflict do nothing;
    update public.profiles set is_admin = true where id = p_user_id;
  else
    delete from public.user_roles where user_id = p_user_id and role = 'admin';
    update public.profiles set is_admin = false where id = p_user_id;
  end if;
end $$;

-- ============================================================
-- RPC: seed_default_points_schema
-- ============================================================
create or replace function public.seed_default_points_schema(p_game_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_stage int[]    := array[25,20,16,14,12,10,9,8,7,6,5,4,3,2,1];
  v_jersey int[]   := array[15,12,10,8,6,5,4,3,2,1];
  v_pos int;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  delete from public.points_schema where game_id = p_game_id;
  for v_pos in 1..array_length(v_stage,1) loop
    insert into public.points_schema(game_id, classification, position, points)
      values (p_game_id, 'stage', v_pos, v_stage[v_pos]);
  end loop;
  for v_pos in 1..array_length(v_jersey,1) loop
    insert into public.points_schema(game_id, classification, position, points) values
      (p_game_id, 'gc', v_pos, v_jersey[v_pos]),
      (p_game_id, 'kom', v_pos, v_jersey[v_pos]),
      (p_game_id, 'points', v_pos, v_jersey[v_pos]),
      (p_game_id, 'youth', v_pos, v_jersey[v_pos]);
  end loop;
end $$;

-- ============================================================
-- RPC: calculate_stage_scores  (joker = 2x)
-- ============================================================
create or replace function public.calculate_stage_scores(p_stage_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_game uuid;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select game_id into v_game from public.stages where id = p_stage_id;
  if v_game is null then raise exception 'Stage not found'; end if;

  delete from public.stage_points where stage_id = p_stage_id;

  with rider_pts as (
    select sr.rider_id, sum(coalesce(ps.points,0)) as pts
    from public.stage_results sr
    left join public.points_schema ps on ps.game_id = v_game and (
      (ps.classification = 'stage'  and ps.position = sr.finish_position) or
      (ps.classification = 'gc'     and ps.position = sr.gc_position)     or
      (ps.classification = 'kom'    and ps.position = sr.mountain_position) or
      (ps.classification = 'points' and ps.position = sr.points_position) or
      (ps.classification = 'youth'  and ps.position = sr.youth_position)
    )
    where sr.stage_id = p_stage_id
    group by sr.rider_id
  ),
  entry_rider_pts as (
    -- picks
    select ep.entry_id, ep.rider_id, coalesce(rp.pts,0) as base_pts,
           case when ej.rider_id is not null then 2 else 1 end as mult
    from public.entry_picks ep
    join public.entries e on e.id = ep.entry_id and e.game_id = v_game and e.status = 'submitted'
    left join rider_pts rp on rp.rider_id = ep.rider_id
    left join public.entry_jokers ej on ej.entry_id = ep.entry_id and ej.rider_id = ep.rider_id
    union all
    -- jokers that aren't already in picks (extra contribution none, jokers are multipliers on picks)
    select ej.entry_id, ej.rider_id, coalesce(rp.pts,0), 1
    from public.entry_jokers ej
    join public.entries e on e.id = ej.entry_id and e.game_id = v_game and e.status = 'submitted'
    left join rider_pts rp on rp.rider_id = ej.rider_id
    where not exists(select 1 from public.entry_picks ep where ep.entry_id = ej.entry_id and ep.rider_id = ej.rider_id)
  )
  insert into public.stage_points(stage_id, entry_id, points)
  select p_stage_id, entry_id, sum(base_pts * mult)::int
  from entry_rider_pts
  group by entry_id;
end $$;

-- ============================================================
-- RPC: update_total_ranking + full_recalculation
-- ============================================================
create or replace function public.update_total_ranking(p_game_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;

  insert into public.total_points(entry_id, total_points, updated_at)
  select e.id, coalesce(sum(sp.points),0)::int, now()
  from public.entries e
  left join public.stage_points sp on sp.entry_id = e.id
  left join public.stages s on s.id = sp.stage_id and s.game_id = p_game_id
  where e.game_id = p_game_id
  group by e.id
  on conflict (entry_id) do update set total_points = excluded.total_points, updated_at = now();

  update public.entries e
  set total_points = coalesce(tp.total_points,0)
  from public.total_points tp
  where tp.entry_id = e.id and e.game_id = p_game_id;
end $$;

create or replace function public.full_recalculation(p_game_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_stage uuid;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  delete from public.stage_points where stage_id in (select id from public.stages where game_id = p_game_id);
  for v_stage in select id from public.stages where game_id = p_game_id loop
    perform public.calculate_stage_scores(v_stage);
  end loop;
  perform public.update_total_ranking(p_game_id);
end $$;

-- ============================================================
-- ADMIN OVERVIEW VIEWS
-- ============================================================
drop view if exists public.admin_user_overview cascade;
create or replace view public.admin_user_overview
with (security_invoker = true)
as
select
  u.id as user_id,
  u.email,
  u.created_at,
  coalesce(p.is_admin, false) as is_admin,
  (select count(*) from public.entries e where e.user_id = u.id) as teams_count
from auth.users u
left join public.profiles p on p.id = u.id;

drop view if exists public.admin_entries_overview cascade;
create or replace view public.admin_entries_overview
with (security_invoker = true)
as
select
  e.id as entry_id,
  e.game_id,
  e.user_id,
  e.team_name,
  e.status as entry_status,
  e.submitted_at,
  e.created_at,
  e.total_points,
  u.email,
  coalesce(p.display_name, u.email) as display_name,
  (select count(*) from public.entry_picks ep where ep.entry_id = e.id) as picks_count,
  (select count(*) from public.entry_jokers ej where ej.entry_id = e.id) as jokers_count
from public.entries e
join auth.users u on u.id = e.user_id
left join public.profiles p on p.id = e.user_id;

grant select on public.admin_user_overview to authenticated;
grant select on public.admin_entries_overview to authenticated;


-- ########## COMPAT: oud team-model (user_teams/team_picks) ##########
create table if not exists public.user_teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  name text, created_at timestamptz not null default now(),
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
create unique index if not exists team_picks_unique_rider on public.team_picks(team_id, rider_id);
create unique index if not exists team_picks_unique_category on public.team_picks(team_id, category_id) where is_joker = false;
create index if not exists team_picks_team_idx on public.team_picks(team_id);
alter table public.user_teams enable row level security;
alter table public.team_picks enable row level security;
drop policy if exists user_teams_rw on public.user_teams;
create policy user_teams_rw on public.user_teams for all
  using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
drop policy if exists team_picks_rw on public.team_picks;
create policy team_picks_rw on public.team_picks for all
  using (exists(select 1 from public.user_teams t where t.id = team_id and (t.user_id = auth.uid() or public.is_admin())))
  with check (exists(select 1 from public.user_teams t where t.id = team_id and (t.user_id = auth.uid() or public.is_admin())));


-- ########## MIGRATIE: 20260201_admin_v3.sql ##########

-- ============================================================
-- KOERSPOULE 2026 — ADMIN V3 EXTENSIONS (idempotent)
-- Voer dit uit in de Supabase SQL Editor BOVENOP supabase/schema.sql
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. GAMES: type (giro/tdf/vuelta), year, status
-- ------------------------------------------------------------
do $$ begin
  create type public.game_type as enum ('giro','tdf','vuelta');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.game_status as enum ('draft','open','locked','live','finished');
exception when duplicate_object then null; end $$;

alter table public.games
  add column if not exists game_type text,
  add column if not exists year int,
  add column if not exists status public.game_status not null default 'draft';

-- Unieke combinatie type+jaar (één Giro 2026, één TdF 2026, etc.)
create unique index if not exists games_type_year_unique
  on public.games(game_type, year)
  where game_type is not null and year is not null;

-- ------------------------------------------------------------
-- 2. CATEGORIES: max_picks (1=single, n=multiple)
-- ------------------------------------------------------------
alter table public.categories
  add column if not exists max_picks int not null default 1;

alter table public.categories
  drop constraint if exists categories_max_picks_check;
alter table public.categories
  add constraint categories_max_picks_check check (max_picks >= 1 and max_picks <= 20);

-- ------------------------------------------------------------
-- 3. CLASSIFICATION RESULTS (top 20 per klassement per etappe)
--    Klassementen: stage, gc, kom, points, youth
-- ------------------------------------------------------------
do $$ begin
  create type public.classification_kind as enum ('stage','gc','kom','points','youth');
exception when duplicate_object then null; end $$;

create table if not exists public.classification_results (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  classification public.classification_kind not null,
  position int not null,
  rider_id uuid not null references public.riders(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(stage_id, classification, position),
  unique(stage_id, classification, rider_id),
  check (position between 1 and 20)
);

create index if not exists classification_results_stage_idx
  on public.classification_results(stage_id, classification);

alter table public.classification_results enable row level security;

drop policy if exists "read_classification_results" on public.classification_results;
drop policy if exists "read_classification_results" on public.classification_results;
create policy "read_classification_results" on public.classification_results
  for select using (auth.uid() is not null);

drop policy if exists "admin_write_classification_results" on public.classification_results;
drop policy if exists "admin_write_classification_results" on public.classification_results;
create policy "admin_write_classification_results" on public.classification_results
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 4. POINTS SCHEMA per klassement
-- ------------------------------------------------------------
alter table public.points_schema
  add column if not exists classification public.classification_kind not null default 'stage';

-- Drop oude unique constraint en voeg nieuwe toe (game + classification + position)
do $$ begin
  alter table public.points_schema drop constraint points_schema_game_id_position_key;
exception when undefined_object then null; end $$;

create unique index if not exists points_schema_game_class_pos
  on public.points_schema(game_id, classification, position);

-- ------------------------------------------------------------
-- 5. RPC: import_classification_results(stage_id, kind, results)
--    results = [{ rider_id, position }, ...]
-- ------------------------------------------------------------
create or replace function public.import_classification_results(
  p_stage_id uuid,
  p_kind public.classification_kind,
  p_results jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  delete from public.classification_results
   where stage_id = p_stage_id and classification = p_kind;

  insert into public.classification_results(stage_id, classification, position, rider_id)
  select p_stage_id, p_kind, (r->>'position')::int, (r->>'rider_id')::uuid
    from jsonb_array_elements(p_results) r;

  -- spiegel naar stage_results als kind = 'stage' (back-compat)
  if p_kind = 'stage' then
    delete from public.stage_results where stage_id = p_stage_id;
    insert into public.stage_results(stage_id, rider_id, position)
    select p_stage_id, (r->>'rider_id')::uuid, (r->>'position')::int
      from jsonb_array_elements(p_results) r;
  end if;
end $$;

-- ------------------------------------------------------------
-- 6. RPC: calculate_stage_points_v3(stage_id)
--    Telt punten over ALLE klassementen op (stage + gc + kom + points + youth)
--    Joker = 2x.
-- ------------------------------------------------------------
create or replace function public.calculate_stage_points_v3(p_stage_id uuid)
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
    coalesce(sum(ps.points * case when tp.is_joker then 2 else 1 end), 0)::int
  from public.classification_results cr
  join public.points_schema ps
    on ps.game_id = v_game_id
   and ps.classification = cr.classification
   and ps.position = cr.position
  join public.team_picks tp on tp.rider_id = cr.rider_id
  join public.user_teams ut on ut.id = tp.team_id and ut.game_id = v_game_id
  where cr.stage_id = p_stage_id
  group by tp.team_id;
end $$;

-- ------------------------------------------------------------
-- 7. RPC: full_recalculation_v3(game_id)
-- ------------------------------------------------------------
create or replace function public.full_recalculation_v3(p_game_id uuid)
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
    perform public.calculate_stage_points_v3(v_stage_id);
  end loop;

  perform public.update_total_ranking(p_game_id);
end $$;

-- ------------------------------------------------------------
-- 8. SEED standaard puntentabellen voor een game (helper)
-- ------------------------------------------------------------
create or replace function public.seed_default_points_schema(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage int[] := array[50,40,32,26,22,19,17,15,13,11,10,9,8,7,6,5,4,3,2,1];
  v_jersey int[] := array[25,20,16,13,11,10,9,8,7,6,5,4,3,2,1,1,1,1,1,1];
  v_kind public.classification_kind;
  v_pts int[];
  i int;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  delete from public.points_schema where game_id = p_game_id;

  foreach v_kind in array array['stage','gc','kom','points','youth']::public.classification_kind[]
  loop
    if v_kind = 'stage' then v_pts := v_stage; else v_pts := v_jersey; end if;
    for i in 1..20 loop
      insert into public.points_schema(game_id, classification, position, points)
      values (p_game_id, v_kind, i, v_pts[i]);
    end loop;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 9. ADMIN HELPERS: assign_admin_role / list_users
-- ------------------------------------------------------------
create or replace function public.assign_admin_role(p_user_id uuid, p_make_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if p_make_admin then
    insert into public.user_roles(user_id, role) values (p_user_id, 'admin')
      on conflict (user_id, role) do nothing;
  else
    delete from public.user_roles where user_id = p_user_id and role = 'admin';
  end if;
end $$;

drop view if exists public.admin_user_overview cascade;
create or replace view public.admin_user_overview as
select
  u.id as user_id,
  u.email,
  u.created_at,
  exists(select 1 from public.user_roles r where r.user_id = u.id and r.role = 'admin') as is_admin,
  (select count(*) from public.user_teams ut where ut.user_id = u.id) as teams_count
from auth.users u;

-- Lees-policy voor de view: alleen admins
revoke all on public.admin_user_overview from anon, authenticated;
grant select on public.admin_user_overview to authenticated;

-- ------------------------------------------------------------
-- 10. PROFILES legacy compat (Admin.tsx oude versie las profiles.is_admin)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_self_modify" on public.profiles;
drop policy if exists "profiles_self_modify" on public.profiles;
create policy "profiles_self_modify" on public.profiles
  for all using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- Houd profiles.is_admin gesynchroniseerd met user_roles.admin
create or replace function public.sync_profile_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') and NEW.role = 'admin' then
    insert into public.profiles(id, is_admin) values (NEW.user_id, true)
      on conflict (id) do update set is_admin = true;
  end if;
  if tg_op = 'DELETE' and OLD.role = 'admin' then
    update public.profiles set is_admin = false where id = OLD.user_id;
  end if;
  return null;
end $$;

drop trigger if exists trg_sync_profile_admin on public.user_roles;
create trigger trg_sync_profile_admin
  after insert or update or delete on public.user_roles
  for each row execute function public.sync_profile_admin();

-- ============================================================
-- KLAAR. Geef vervolgens je eigen account admin-rechten:
--
--   insert into public.user_roles(user_id, role)
--   select id, 'admin' from auth.users where email = 'jouw-email@adres.nl'
--   on conflict (user_id, role) do nothing;
-- ============================================================


-- ########## MIGRATIE: 20260202_backend_v4.sql ##########

-- ============================================================
-- KOERSPOULE 2026 — BACKEND V4 (COMPLETE)
-- Dit is een idempotente migration die de volledige backend
-- functionaliteit levert: score engine, pick-validatie,
-- deadline-locking, subpoules, leaderboard views, RLS,
-- notification log.
--
-- Hoe te draaien: Supabase Dashboard → SQL Editor → New query
--   → plak ALLE inhoud → Run.
-- Veilig om opnieuw te draaien (alle DDL is "if not exists" /
-- "create or replace").
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- 0. HELPER: huidige user is admin (gebruikt `is_admin()` uit
--    schema.sql). Definieer als safety een extra admin-check
--    op user_roles, met fallback naar profiles.is_admin.
-- ============================================================
create or replace function public.is_current_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists(select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'),
    false
  ) or coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- 1. SCORE ENGINE
-- ============================================================
-- Punten-engine logica:
--   - entry_picks(entry_id, category_id, rider_id) = picks van een speler
--   - entry_jokers(entry_id, rider_id) = joker(s) — verdubbelt punten
--   - stage_results(stage_id, rider_id, finish/gc/mountain/points/youth_position)
--   - points_schema(game_id, classification, position, points)
--
-- Voor elke pick van een speler: tel punten op die de gekozen
-- renner verdiende in deze etappe over alle 5 klassementen.
-- Joker = 2x.
-- ============================================================

create or replace function public.calculate_stage_points_v4(p_stage_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_id uuid;
begin
  if not public.is_current_admin() then
    raise exception 'Not authorized';
  end if;

  select game_id into v_game_id from public.stages where id = p_stage_id;
  if v_game_id is null then
    raise exception 'Stage % not found', p_stage_id;
  end if;

  -- Wis bestaande stage_points voor deze etappe
  delete from public.stage_points where stage_id = p_stage_id;

  -- Bereken per entry de som van punten over alle klassementen
  -- voor alle picks. Joker geeft x2.
  with rider_classification_points as (
    -- Voor elke renner in deze etappe: punten per klassement
    select
      sr.rider_id,
      ps.classification,
      ps.points
    from public.stage_results sr
    cross join lateral (
      values
        ('stage'::public.classification_kind,  sr.finish_position),
        ('gc'::public.classification_kind,     sr.gc_position),
        ('kom'::public.classification_kind,    sr.mountain_position),
        ('points'::public.classification_kind, sr.points_position),
        ('youth'::public.classification_kind,  sr.youth_position)
    ) as cls(classification, position)
    join public.points_schema ps
      on ps.game_id = v_game_id
     and ps.classification = cls.classification
     and ps.position = cls.position
    where sr.stage_id = p_stage_id
      and cls.position is not null
  ),
  rider_total_points as (
    select rider_id, sum(points)::int as base_points
    from rider_classification_points
    group by rider_id
  ),
  -- Punten per entry: som over picks; joker x2
  entry_points as (
    select
      ep.entry_id,
      sum(
        rtp.base_points *
        case when exists(
          select 1 from public.entry_jokers ej
          where ej.entry_id = ep.entry_id and ej.rider_id = ep.rider_id
        ) then 2 else 1 end
      )::int as points
    from public.entry_picks ep
    join rider_total_points rtp on rtp.rider_id = ep.rider_id
    join public.entries e on e.id = ep.entry_id and e.game_id = v_game_id
    group by ep.entry_id
  )
  insert into public.stage_points(stage_id, entry_id, points)
  select p_stage_id, entry_id, points from entry_points
  on conflict (stage_id, entry_id) do update set points = excluded.points;
end $$;

comment on function public.calculate_stage_points_v4(uuid) is
  'Berekent punten per entry voor een etappe op basis van alle 5 klassementen + joker x2';

-- ------------------------------------------------------------
-- update_total_points_v4 — refresh total_points table per game
-- ------------------------------------------------------------
create or replace function public.update_total_points_v4(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_admin() then
    raise exception 'Not authorized';
  end if;

  insert into public.total_points(entry_id, total_points, updated_at)
  select e.id,
         coalesce(sum(sp.points), 0)::int,
         now()
  from public.entries e
  left join public.stage_points sp on sp.entry_id = e.id
  left join public.stages s on s.id = sp.stage_id and s.game_id = p_game_id
  where e.game_id = p_game_id
  group by e.id
  on conflict (entry_id)
  do update set total_points = excluded.total_points, updated_at = now();
end $$;

-- ------------------------------------------------------------
-- full_recalculation_v4 — herberekent alles
-- ------------------------------------------------------------
create or replace function public.full_recalculation_v4(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage_id uuid;
begin
  if not public.is_current_admin() then
    raise exception 'Not authorized';
  end if;

  -- Wis alle berekende punten voor deze game
  delete from public.stage_points
   where stage_id in (select id from public.stages where game_id = p_game_id);

  -- Herbereken per etappe
  for v_stage_id in select id from public.stages where game_id = p_game_id loop
    perform public.calculate_stage_points_v4(v_stage_id);
  end loop;

  -- Refresh totals
  perform public.update_total_points_v4(p_game_id);
end $$;

-- ============================================================
-- 2. PICK-VALIDATIE — afdwingen van categories.max_picks
-- ============================================================
create or replace function public.enforce_max_picks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_picks int;
  v_current_count int;
begin
  if NEW.category_id is null then
    return NEW;
  end if;

  select max_picks into v_max_picks
  from public.categories where id = NEW.category_id;

  if v_max_picks is null then
    return NEW;
  end if;

  select count(*) into v_current_count
  from public.entry_picks
  where entry_id = NEW.entry_id
    and category_id = NEW.category_id
    and (TG_OP <> 'UPDATE' or id <> NEW.id);

  if v_current_count >= v_max_picks then
    raise exception 'Maximaal % keuze(s) toegestaan in deze categorie',
      v_max_picks
      using errcode = '23514';
  end if;

  return NEW;
end $$;

drop trigger if exists trg_enforce_max_picks on public.entry_picks;
create trigger trg_enforce_max_picks
  before insert or update on public.entry_picks
  for each row execute function public.enforce_max_picks();

-- ============================================================
-- 3. DEADLINE LOCKING — geen wijzigingen na status=locked
-- ============================================================
create or replace function public.enforce_entry_deadline()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.game_status;
  v_entry_id uuid;
  v_game_id uuid;
begin
  -- Vind de bijbehorende entry_id (tabel-afhankelijk)
  if TG_TABLE_NAME = 'entries' then
    v_game_id := coalesce(NEW.game_id, OLD.game_id);
  elsif TG_TABLE_NAME in ('entry_picks', 'entry_jokers') then
    v_entry_id := coalesce(NEW.entry_id, OLD.entry_id);
    select game_id into v_game_id from public.entries where id = v_entry_id;
  end if;

  if v_game_id is null then return NEW; end if;

  select status into v_status from public.games where id = v_game_id;

  -- Admins mogen altijd
  if public.is_current_admin() then return NEW; end if;

  -- Deadline-bewaking: vanaf 'locked' geen wijzigingen meer
  if v_status in ('locked', 'live', 'finished') then
    -- Uitzondering: een UPDATE op de entries-tabel die de status NIET wijzigt
    -- mag altijd door — zo blijft de ploegnaam (en de systeem-puntentelling)
    -- aanpasbaar in elke game-status. Submit/revert (status-wissel) en
    -- INSERT/DELETE blijven geblokkeerd na de deadline.
    if TG_TABLE_NAME = 'entries' and TG_OP = 'UPDATE'
       and NEW.status is not distinct from OLD.status then
      return NEW;
    end if;
    raise exception 'Deze game is gesloten (status %). Inzendingen kunnen niet meer worden gewijzigd.', v_status
      using errcode = '42501';
  end if;

  return NEW;
end $$;

drop trigger if exists trg_deadline_entries on public.entries;
create trigger trg_deadline_entries
  before insert or update or delete on public.entries
  for each row execute function public.enforce_entry_deadline();

drop trigger if exists trg_deadline_entry_picks on public.entry_picks;
create trigger trg_deadline_entry_picks
  before insert or update or delete on public.entry_picks
  for each row execute function public.enforce_entry_deadline();

drop trigger if exists trg_deadline_entry_jokers on public.entry_jokers;
create trigger trg_deadline_entry_jokers
  before insert or update or delete on public.entry_jokers
  for each row execute function public.enforce_entry_deadline();

-- ============================================================
-- 4. SUBPOULES — mini-competities
-- ============================================================

-- Maak subpoule aan en wordt automatisch eerste lid
create or replace function public.create_subpoule(
  p_name text,
  p_game_id uuid,
  p_code text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_code text := coalesce(p_code, upper(substr(md5(random()::text), 1, 6)));
begin
  if v_uid is null then raise exception 'Niet ingelogd'; end if;

  insert into public.subpoules(name, game_id, code, owner_user_id)
  values (p_name, p_game_id, v_code, v_uid)
  returning id into v_id;

  insert into public.subpoule_members(subpoule_id, user_id)
  values (v_id, v_uid)
  on conflict do nothing;

  return v_id;
end $$;

-- Join subpoule via code
create or replace function public.join_subpoule(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'Niet ingelogd'; end if;

  select id into v_id from public.subpoules where code = p_code;
  if v_id is null then raise exception 'Code niet gevonden'; end if;

  insert into public.subpoule_members(subpoule_id, user_id)
  values (v_id, v_uid)
  on conflict do nothing;

  return v_id;
end $$;

-- Verlaat subpoule
create or replace function public.leave_subpoule(p_subpoule_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
begin
  if v_uid is null then raise exception 'Niet ingelogd'; end if;

  select owner_user_id into v_owner from public.subpoules where id = p_subpoule_id;
  if v_owner = v_uid then
    raise exception 'Eigenaar kan poule niet verlaten — verwijder of wijs nieuwe eigenaar aan';
  end if;

  delete from public.subpoule_members
   where subpoule_id = p_subpoule_id and user_id = v_uid;
end $$;

-- ============================================================
-- 5. LEADERBOARD VIEWS
-- ============================================================

-- Algemeen klassement per game
drop view if exists public.leaderboard_global cascade;
create or replace view public.leaderboard_global as
select
  e.game_id,
  e.id as entry_id,
  e.user_id,
  e.team_name,
  coalesce(p.display_name, 'Anonieme renner') as display_name,
  coalesce(tp.total_points, 0) as total_points,
  rank() over (partition by e.game_id order by coalesce(tp.total_points, 0) desc) as rank
from public.entries e
left join public.total_points tp on tp.entry_id = e.id
left join public.profiles p on p.id = e.user_id;

grant select on public.leaderboard_global to authenticated;

-- Subpoule klassement
drop view if exists public.leaderboard_subpoule cascade;
create or replace view public.leaderboard_subpoule as
select
  sm.subpoule_id,
  sp.name as subpoule_name,
  sp.game_id,
  e.id as entry_id,
  e.user_id,
  e.team_name,
  coalesce(p.display_name, 'Anonieme renner') as display_name,
  coalesce(tp.total_points, 0) as total_points,
  rank() over (partition by sm.subpoule_id order by coalesce(tp.total_points, 0) desc) as rank
from public.subpoule_members sm
join public.subpoules sp on sp.id = sm.subpoule_id
join public.entries e on e.user_id = sm.user_id and e.game_id = sp.game_id
left join public.total_points tp on tp.entry_id = e.id
left join public.profiles p on p.id = e.user_id;

grant select on public.leaderboard_subpoule to authenticated;

-- ============================================================
-- 6. RLS REFINEMENTS
-- ============================================================

-- Entries: speler ziet eigen + admin alles
alter table public.entries enable row level security;

drop policy if exists "entries_select" on public.entries;
drop policy if exists "entries_select" on public.entries;
create policy "entries_select" on public.entries
  for select using (auth.uid() = user_id or public.is_current_admin());

drop policy if exists "entries_modify" on public.entries;
drop policy if exists "entries_modify" on public.entries;
create policy "entries_modify" on public.entries
  for all using (auth.uid() = user_id or public.is_current_admin())
  with check (auth.uid() = user_id or public.is_current_admin());

-- Entry_picks via entry-ownership
alter table public.entry_picks enable row level security;

drop policy if exists "entry_picks_select" on public.entry_picks;
drop policy if exists "entry_picks_select" on public.entry_picks;
create policy "entry_picks_select" on public.entry_picks
  for select using (
    exists(select 1 from public.entries e where e.id = entry_id
           and (e.user_id = auth.uid() or public.is_current_admin()))
  );

drop policy if exists "entry_picks_modify" on public.entry_picks;
drop policy if exists "entry_picks_modify" on public.entry_picks;
create policy "entry_picks_modify" on public.entry_picks
  for all using (
    exists(select 1 from public.entries e where e.id = entry_id
           and (e.user_id = auth.uid() or public.is_current_admin()))
  ) with check (
    exists(select 1 from public.entries e where e.id = entry_id
           and (e.user_id = auth.uid() or public.is_current_admin()))
  );

-- Entry_jokers via entry-ownership
alter table public.entry_jokers enable row level security;

drop policy if exists "entry_jokers_select" on public.entry_jokers;
drop policy if exists "entry_jokers_select" on public.entry_jokers;
create policy "entry_jokers_select" on public.entry_jokers
  for select using (
    exists(select 1 from public.entries e where e.id = entry_id
           and (e.user_id = auth.uid() or public.is_current_admin()))
  );

drop policy if exists "entry_jokers_modify" on public.entry_jokers;
drop policy if exists "entry_jokers_modify" on public.entry_jokers;
create policy "entry_jokers_modify" on public.entry_jokers
  for all using (
    exists(select 1 from public.entries e where e.id = entry_id
           and (e.user_id = auth.uid() or public.is_current_admin()))
  ) with check (
    exists(select 1 from public.entries e where e.id = entry_id
           and (e.user_id = auth.uid() or public.is_current_admin()))
  );

-- Subpoules: leden lezen, eigenaar/admin schrijven
alter table public.subpoules enable row level security;

drop policy if exists "subpoules_select" on public.subpoules;
drop policy if exists "subpoules_select" on public.subpoules;
create policy "subpoules_select" on public.subpoules
  for select using (
    public.is_current_admin()
    or owner_user_id = auth.uid()
    or exists(select 1 from public.subpoule_members m
              where m.subpoule_id = id and m.user_id = auth.uid())
  );

drop policy if exists "subpoules_owner_modify" on public.subpoules;
drop policy if exists "subpoules_owner_modify" on public.subpoules;
create policy "subpoules_owner_modify" on public.subpoules
  for all using (owner_user_id = auth.uid() or public.is_current_admin())
  with check (owner_user_id = auth.uid() or public.is_current_admin());

-- Subpoule_members: lid ziet eigen lijst, eigenaar/admin alles
alter table public.subpoule_members enable row level security;

drop policy if exists "subpoule_members_select" on public.subpoule_members;
drop policy if exists "subpoule_members_select" on public.subpoule_members;
create policy "subpoule_members_select" on public.subpoule_members
  for select using (
    user_id = auth.uid()
    or public.is_current_admin()
    or exists(select 1 from public.subpoules sp where sp.id = subpoule_id and sp.owner_user_id = auth.uid())
    or exists(select 1 from public.subpoule_members sm where sm.subpoule_id = subpoule_id and sm.user_id = auth.uid())
  );

drop policy if exists "subpoule_members_self_modify" on public.subpoule_members;
drop policy if exists "subpoule_members_self_modify" on public.subpoule_members;
create policy "subpoule_members_self_modify" on public.subpoule_members
  for all using (
    user_id = auth.uid()
    or public.is_current_admin()
    or exists(select 1 from public.subpoules sp where sp.id = subpoule_id and sp.owner_user_id = auth.uid())
  ) with check (
    user_id = auth.uid()
    or public.is_current_admin()
    or exists(select 1 from public.subpoules sp where sp.id = subpoule_id and sp.owner_user_id = auth.uid())
  );

-- ============================================================
-- 7. NOTIFICATION LOG (audit-trail voor verzonden mails)
-- ============================================================
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  game_id uuid references public.games(id) on delete cascade,
  kind text not null,
  payload jsonb,
  sent_at timestamptz not null default now()
);

create index if not exists notification_log_user_idx on public.notification_log(user_id);
create index if not exists notification_log_game_idx on public.notification_log(game_id);

alter table public.notification_log enable row level security;

drop policy if exists "notification_log_self_select" on public.notification_log;
drop policy if exists "notification_log_self_select" on public.notification_log;
create policy "notification_log_self_select" on public.notification_log
  for select using (auth.uid() = user_id or public.is_current_admin());

drop policy if exists "notification_log_admin_write" on public.notification_log;
drop policy if exists "notification_log_admin_write" on public.notification_log;
create policy "notification_log_admin_write" on public.notification_log
  for insert with check (public.is_current_admin());

-- RPC die admin gebruikt om notificatie te loggen (mail wordt
-- vanuit Edge Function of externe service verzonden)
create or replace function public.log_notification(
  p_user_id uuid,
  p_game_id uuid,
  p_kind text,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_current_admin() then
    raise exception 'Not authorized';
  end if;

  insert into public.notification_log(user_id, game_id, kind, payload)
  values (p_user_id, p_game_id, p_kind, p_payload)
  returning id into v_id;
  return v_id;
end $$;

-- ============================================================
-- 8. ADMIN HELPER VIEW: alle inzendingen voor een game
-- ============================================================
drop view if exists public.admin_entries_overview cascade;
create or replace view public.admin_entries_overview as
select
  e.id as entry_id,
  e.game_id,
  e.user_id,
  e.team_name,
  e.status as entry_status,
  e.submitted_at,
  e.created_at,
  e.updated_at,
  u.email,
  coalesce(p.display_name, 'Anonieme renner') as display_name,
  (select count(*) from public.entry_picks ep where ep.entry_id = e.id) as picks_count,
  (select count(*) from public.entry_jokers ej where ej.entry_id = e.id) as jokers_count,
  coalesce(tp.total_points, 0) as total_points
from public.entries e
join auth.users u on u.id = e.user_id
left join public.profiles p on p.id = e.user_id
left join public.total_points tp on tp.entry_id = e.id;

revoke all on public.admin_entries_overview from anon, authenticated;
grant select on public.admin_entries_overview to authenticated;

-- (RLS via onderliggende tabellen — admin krijgt alles via is_current_admin)

-- ============================================================
-- 9. GRANTS voor RPCs (authenticated mag aanroepen — RPC checkt zelf)
-- ============================================================
grant execute on function public.calculate_stage_points_v4(uuid) to authenticated;
grant execute on function public.update_total_points_v4(uuid) to authenticated;
grant execute on function public.full_recalculation_v4(uuid) to authenticated;
grant execute on function public.create_subpoule(text, uuid, text) to authenticated;
grant execute on function public.join_subpoule(text) to authenticated;
grant execute on function public.leave_subpoule(uuid) to authenticated;
grant execute on function public.log_notification(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.is_current_admin() to authenticated;

-- ============================================================
-- KLAAR
-- Test-snippets voor in SQL Editor:
--
-- 1. Bereken etappe 1 punten:
--    select public.calculate_stage_points_v4('<stage-uuid>');
--
-- 2. Refresh totaalstand:
--    select public.update_total_points_v4('<game-uuid>');
--
-- 3. Volledige herberekening:
--    select public.full_recalculation_v4('<game-uuid>');
--
-- 4. Algemeen klassement bekijken:
--    select * from public.leaderboard_global
--    where game_id = '<game-uuid>' order by rank limit 20;
-- ============================================================


-- ########## MIGRATIE: 20260430193612_ce53ca0e-6b9e-4504-a5a8-c1b228c31bc7.sql ##########


-- Lock down SECURITY DEFINER functions: only authenticated users may execute
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.handle_new_user() from public, anon;
revoke execute on function public.save_entry_pick(uuid, uuid, uuid) from public, anon;
revoke execute on function public.save_entry_jokers(uuid, uuid[]) from public, anon;
revoke execute on function public.submit_entry(uuid) from public, anon;
revoke execute on function public.assign_admin_role(uuid, boolean) from public, anon;
revoke execute on function public.seed_default_points_schema(uuid) from public, anon;
revoke execute on function public.calculate_stage_scores(uuid) from public, anon;
revoke execute on function public.update_total_ranking(uuid) from public, anon;
revoke execute on function public.full_recalculation(uuid) from public, anon;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.save_entry_pick(uuid, uuid, uuid) to authenticated;
grant execute on function public.save_entry_jokers(uuid, uuid[]) to authenticated;
grant execute on function public.submit_entry(uuid) to authenticated;
grant execute on function public.assign_admin_role(uuid, boolean) to authenticated;
grant execute on function public.seed_default_points_schema(uuid) to authenticated;
grant execute on function public.calculate_stage_scores(uuid) to authenticated;
grant execute on function public.update_total_ranking(uuid) to authenticated;
grant execute on function public.full_recalculation(uuid) to authenticated;

-- Fix mutable search_path on trigger function
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;


-- ########## MIGRATIE: 20260430193653_bbb1d92e-467c-4cd0-b657-eb53cd99e29a.sql ##########


-- Categories: add max_picks + order_index (alias of sort_order)
alter table public.categories add column if not exists max_picks int not null default 1;
alter table public.categories add column if not exists order_index int;
update public.categories set order_index = sort_order where order_index is null;

-- Riders: allow direct game link + legacy team text + game-scoped start number
alter table public.riders add column if not exists game_id uuid references public.games(id) on delete cascade;
alter table public.riders add column if not exists team text;
create unique index if not exists riders_game_startnum_uniq
  on public.riders(game_id, start_number) where start_number is not null;

-- game_riders: optional category link (legacy admin uses this)
alter table public.game_riders add column if not exists category_id uuid references public.categories(id) on delete set null;


-- ########## MIGRATIE: 20260430193709_25d19525-66bb-428a-aed0-2565e30592c3.sql ##########


alter table public.games add column if not exists game_type text default 'giro' check (game_type in ('giro','tour','vuelta','other'));


-- ########## MIGRATIE: 20260430193735_f5d76a4d-906e-49ea-8a0b-4b5da5fe4f34.sql ##########


alter table public.games add column if not exists starts_at timestamptz;
alter table public.games add column if not exists slug text;
create unique index if not exists games_slug_uniq on public.games(slug) where slug is not null;

alter table public.stage_results add column if not exists did_finish boolean;
alter table public.stage_results add column if not exists start_number int;
alter table public.stage_results add column if not exists rider_name text;
alter table public.stage_results add column if not exists game_id uuid references public.games(id) on delete cascade;


-- ########## MIGRATIE: 20260501170336_42accc6e-39fa-4c8b-8fca-c3af7c756223.sql ##########

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

-- ########## MIGRATIE: 20260501172931_ef2253ae-99eb-4db5-b698-dc6e27baefcd.sql ##########

-- Fix startlist upsert conflict targets by replacing partial unique indexes
-- with full unique indexes that PostgREST can use for ON CONFLICT.

-- Deduplicate teams for the same game/name, keeping the oldest row.
with ranked_teams as (
  select
    ctid,
    row_number() over (
      partition by game_id, name
      order by created_at asc, id asc
    ) as rn
  from public.teams
  where game_id is not null
    and name is not null
)
delete from public.teams t
using ranked_teams rt
where t.ctid = rt.ctid
  and rt.rn > 1;

-- Deduplicate riders for the same game/start number, keeping the oldest row.
with ranked_riders as (
  select
    ctid,
    row_number() over (
      partition by game_id, start_number
      order by created_at asc, id asc
    ) as rn
  from public.riders
  where game_id is not null
    and start_number is not null
)
delete from public.riders r
using ranked_riders rr
where r.ctid = rr.ctid
  and rr.rn > 1;

-- Drop the old partial indexes. Partial indexes cannot reliably satisfy
-- PostgREST/Supabase upsert calls using onConflict: "game_id,name" or
-- "game_id,start_number".
drop index if exists public.teams_game_name_uniq;
drop index if exists public.riders_game_startnum_uniq;

-- Create full unique indexes matching the exact upsert conflict targets.
-- PostgreSQL still allows multiple NULL values, so manually added rows without
-- a game or start number remain possible.
create unique index teams_game_name_uniq
  on public.teams (game_id, name);

create unique index riders_game_startnum_uniq
  on public.riders (game_id, start_number);

-- ########## MIGRATIE: 20260501173456_8749659f-c484-441f-9d37-7e3bf7c5deaa.sql ##########

create unique index if not exists category_riders_unique on public.category_riders(category_id, rider_id);

-- ########## MIGRATIE: 20260501180101_7e928cbf-0248-4a4b-b0f9-d4cff899fd60.sql ##########

ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_game_type_check;
ALTER TABLE public.games ADD CONSTRAINT games_game_type_check
  CHECK (game_type = ANY (ARRAY['giro'::text, 'tour'::text, 'tdf'::text, 'vuelta'::text, 'other'::text]));
UPDATE public.games SET game_type = 'tdf' WHERE game_type = 'tour';

-- ########## MIGRATIE: 20260501182253_bccd4cba-32d9-4a7f-be7a-89552be4675f.sql ##########

-- ============================================
-- 1. STAGES: stage_type kolom
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'stage_type_enum'
  ) THEN
    CREATE TYPE public.stage_type_enum AS ENUM (
      'vlak', 'heuvelachtig', 'tijdrit', 'bergop', 'ploegentijdrit'
    );
  END IF;
END$$;

ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS stage_type public.stage_type_enum NOT NULL DEFAULT 'vlak';

-- ============================================
-- 2. CHAT MESSAGES tabel
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     uuid NOT NULL,
  subpoule_id uuid NULL,                    -- NULL = algemene peloton-chat
  user_id     uuid NOT NULL,
  body        text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_game_subpoule_created_idx
  ON public.chat_messages (game_id, subpoule_id, created_at DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: peloton-chat zichtbaar voor iedereen die is ingelogd;
--         subpoule-chat alleen voor leden, eigenaar of admin
DROP POLICY IF EXISTS chat_messages_select ON public.chat_messages;
drop policy if exists chat_messages_select on public.chat_messages;
CREATE POLICY chat_messages_select ON public.chat_messages
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    subpoule_id IS NULL
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.subpoules s
      WHERE s.id = chat_messages.subpoule_id
        AND s.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.subpoule_members m
      WHERE m.subpoule_id = chat_messages.subpoule_id
        AND m.user_id = auth.uid()
    )
  )
);

-- INSERT: alleen als auteur (user_id = auth.uid()) en met dezelfde toegang als SELECT
DROP POLICY IF EXISTS chat_messages_insert ON public.chat_messages;
drop policy if exists chat_messages_insert on public.chat_messages;
CREATE POLICY chat_messages_insert ON public.chat_messages
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND (
    subpoule_id IS NULL
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.subpoules s
      WHERE s.id = chat_messages.subpoule_id
        AND s.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.subpoule_members m
      WHERE m.subpoule_id = chat_messages.subpoule_id
        AND m.user_id = auth.uid()
    )
  )
);

-- DELETE: eigen auteur of admin
DROP POLICY IF EXISTS chat_messages_delete ON public.chat_messages;
drop policy if exists chat_messages_delete on public.chat_messages;
CREATE POLICY chat_messages_delete ON public.chat_messages
FOR DELETE USING (
  user_id = auth.uid() OR public.is_admin()
);

-- ============================================
-- 3. REALTIME publication
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END$$;

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;


-- ########## MIGRATIE: 20260501183203_77f46762-d66f-49c9-a796-16130b6dc1f6.sql ##########

-- entry_predictions table
CREATE TABLE public.entry_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL,
  classification text NOT NULL CHECK (classification IN ('gc','points','kom','youth')),
  position integer NOT NULL CHECK (position BETWEEN 1 AND 3),
  rider_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entry_id, classification, position)
);

ALTER TABLE public.entry_predictions ENABLE ROW LEVEL SECURITY;

drop policy if exists entry_predictions_select on public.entry_predictions;
CREATE POLICY entry_predictions_select ON public.entry_predictions
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.entries e WHERE e.id = entry_predictions.entry_id AND (e.user_id = auth.uid() OR public.is_admin()))
);

drop policy if exists entry_predictions_modify on public.entry_predictions;
CREATE POLICY entry_predictions_modify ON public.entry_predictions
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.entries e WHERE e.id = entry_predictions.entry_id AND (e.user_id = auth.uid() OR public.is_admin()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.entries e WHERE e.id = entry_predictions.entry_id AND (e.user_id = auth.uid() OR public.is_admin()))
);

CREATE INDEX idx_entry_predictions_entry ON public.entry_predictions(entry_id);

-- RPC: save predictions atomically
CREATE OR REPLACE FUNCTION public.save_entry_predictions(
  p_entry_id uuid,
  p_predictions jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_status text;
  v_pred jsonb;
BEGIN
  SELECT user_id, status INTO v_user, v_status FROM public.entries WHERE id = p_entry_id;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF v_user <> auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_status = 'submitted' AND NOT public.is_admin() THEN RAISE EXCEPTION 'Entry already submitted'; END IF;

  DELETE FROM public.entry_predictions WHERE entry_id = p_entry_id;

  IF p_predictions IS NOT NULL AND jsonb_array_length(p_predictions) > 0 THEN
    FOR v_pred IN SELECT * FROM jsonb_array_elements(p_predictions) LOOP
      INSERT INTO public.entry_predictions (entry_id, classification, position, rider_id)
      VALUES (
        p_entry_id,
        v_pred->>'classification',
        (v_pred->>'position')::int,
        (v_pred->>'rider_id')::uuid
      );
    END LOOP;
  END IF;
END;
$$;

-- ########## MIGRATIE: 20260501183720_e0beb57d-7a58-419f-9d10-3763f6bac37f.sql ##########

-- Bugfix: subpoules_select policy referenced m.id instead of subpoules.id
DROP POLICY IF EXISTS subpoules_select ON public.subpoules;
drop policy if exists subpoules_select on public.subpoules;
CREATE POLICY subpoules_select ON public.subpoules
FOR SELECT USING (
  (owner_user_id = auth.uid())
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.subpoule_members m
    WHERE m.subpoule_id = subpoules.id AND m.user_id = auth.uid()
  )
);

-- Ensure unique name per game
CREATE UNIQUE INDEX IF NOT EXISTS subpoules_game_name_unique ON public.subpoules(game_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS subpoules_code_unique ON public.subpoules(code);

-- create_subpoule RPC
CREATE OR REPLACE FUNCTION public.create_subpoule(
  p_game_id uuid,
  p_name text,
  p_code text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  IF p_name IS NULL OR length(trim(p_name)) < 2 THEN RAISE EXCEPTION 'Naam te kort'; END IF;
  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN RAISE EXCEPTION 'Code te kort (min 4 tekens)'; END IF;

  IF EXISTS (SELECT 1 FROM public.subpoules WHERE game_id = p_game_id AND lower(name) = lower(trim(p_name))) THEN
    RAISE EXCEPTION 'Een subpoule met deze naam bestaat al';
  END IF;
  IF EXISTS (SELECT 1 FROM public.subpoules WHERE code = trim(p_code)) THEN
    RAISE EXCEPTION 'Deze code is al in gebruik';
  END IF;

  INSERT INTO public.subpoules (game_id, owner_user_id, name, code)
  VALUES (p_game_id, auth.uid(), trim(p_name), trim(p_code))
  RETURNING id INTO v_id;

  INSERT INTO public.subpoule_members (subpoule_id, user_id) VALUES (v_id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END $$;

-- join_subpoule RPC
CREATE OR REPLACE FUNCTION public.join_subpoule(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  SELECT id INTO v_id FROM public.subpoules WHERE code = trim(p_code);
  IF v_id IS NULL THEN RAISE EXCEPTION 'Ongeldige code'; END IF;

  INSERT INTO public.subpoule_members (subpoule_id, user_id) VALUES (v_id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END $$;

-- leave_subpoule RPC
CREATE OR REPLACE FUNCTION public.leave_subpoule(p_subpoule_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  SELECT owner_user_id INTO v_owner FROM public.subpoules WHERE id = p_subpoule_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Subpoule niet gevonden'; END IF;
  IF v_owner = auth.uid() THEN
    RAISE EXCEPTION 'Eigenaar kan subpoule niet verlaten — verwijder de subpoule of draag eigenaarschap over';
  END IF;
  DELETE FROM public.subpoule_members WHERE subpoule_id = p_subpoule_id AND user_id = auth.uid();
END $$;

-- remove_subpoule_member RPC (owner only)
CREATE OR REPLACE FUNCTION public.remove_subpoule_member(p_subpoule_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  SELECT owner_user_id INTO v_owner FROM public.subpoules WHERE id = p_subpoule_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Subpoule niet gevonden'; END IF;
  IF v_owner <> auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'Alleen eigenaar mag leden verwijderen'; END IF;
  IF p_user_id = v_owner THEN RAISE EXCEPTION 'Eigenaar kan niet verwijderd worden'; END IF;
  DELETE FROM public.subpoule_members WHERE subpoule_id = p_subpoule_id AND user_id = p_user_id;
END $$;

-- delete_subpoule RPC
CREATE OR REPLACE FUNCTION public.delete_subpoule(p_subpoule_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  SELECT owner_user_id INTO v_owner FROM public.subpoules WHERE id = p_subpoule_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Subpoule niet gevonden'; END IF;
  IF v_owner <> auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'Alleen eigenaar mag verwijderen'; END IF;
  DELETE FROM public.subpoule_members WHERE subpoule_id = p_subpoule_id;
  DELETE FROM public.chat_messages WHERE subpoule_id = p_subpoule_id;
  DELETE FROM public.subpoules WHERE id = p_subpoule_id;
END $$;

-- ########## MIGRATIE: 20260501190706_bc00e123-4aff-4b63-be5c-38a2f58c200c.sql ##########

NOTIFY pgrst, 'reload schema';

-- ########## MIGRATIE: 20260502102437_052f8c97-c651-47ce-ad0c-16dd589810e1.sql ##########

-- Fix admin_entries_overview: remove auth.users dependency for client access
-- Recreate view to run with definer rights so it can read auth.users,
-- and restrict via underlying RLS check using is_admin() in a wrapper.

DROP VIEW IF EXISTS public.admin_entries_overview;

CREATE OR REPLACE FUNCTION public.admin_entries_overview()
RETURNS TABLE (
  entry_id uuid,
  game_id uuid,
  user_id uuid,
  team_name text,
  entry_status text,
  submitted_at timestamptz,
  created_at timestamptz,
  total_points int,
  email text,
  display_name text,
  picks_count bigint,
  jokers_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    e.id AS entry_id,
    e.game_id,
    e.user_id,
    e.team_name,
    e.status AS entry_status,
    e.submitted_at,
    e.created_at,
    e.total_points,
    u.email::text AS email,
    COALESCE(p.display_name, u.email::text) AS display_name,
    (SELECT count(*) FROM public.entry_picks ep WHERE ep.entry_id = e.id) AS picks_count,
    (SELECT count(*) FROM public.entry_jokers ej WHERE ej.entry_id = e.id) AS jokers_count
  FROM public.entries e
  JOIN auth.users u ON u.id = e.user_id
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.admin_entries_overview() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_entries_overview() TO authenticated;

-- Recreate the view name as a thin wrapper around the function so the existing
-- client query (`from('admin_entries_overview').select('*').eq('game_id', ...)`)
-- keeps working without code changes.
CREATE VIEW public.admin_entries_overview
WITH (security_invoker = on) AS
SELECT * FROM public.admin_entries_overview();

GRANT SELECT ON public.admin_entries_overview TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ########## MIGRATIE: 20260502102707_0f58a5eb-bc9c-41fa-9d49-590895adeead.sql ##########

-- Allow edits on submitted entries until game status is 'closed' or 'live'.
-- Block only when game.status IN ('closed','live').

CREATE OR REPLACE FUNCTION public.save_entry_pick(p_entry_id uuid, p_category_id uuid, p_rider_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_user uuid; v_game uuid; v_game_status text;
begin
  select user_id, game_id into v_user, v_game from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;

  select status into v_game_status from public.games where id = v_game;
  if v_game_status in ('closed','live') and not public.is_admin() then
    raise exception 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  end if;

  if not exists(select 1 from public.category_riders where category_id = p_category_id and rider_id = p_rider_id) then
    raise exception 'Rider does not belong to this category';
  end if;

  delete from public.entry_picks where entry_id = p_entry_id and category_id = p_category_id;
  insert into public.entry_picks (entry_id, category_id, rider_id) values (p_entry_id, p_category_id, p_rider_id);
end $function$;

CREATE OR REPLACE FUNCTION public.save_entry_jokers(p_entry_id uuid, p_rider_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_user uuid; v_game uuid; v_game_status text;
begin
  select user_id, game_id into v_user, v_game from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;

  select status into v_game_status from public.games where id = v_game;
  if v_game_status in ('closed','live') and not public.is_admin() then
    raise exception 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  end if;

  if array_length(p_rider_ids,1) > 2 then raise exception 'Maximum 2 jokers'; end if;

  delete from public.entry_jokers where entry_id = p_entry_id;
  if p_rider_ids is not null and array_length(p_rider_ids,1) > 0 then
    insert into public.entry_jokers (entry_id, rider_id)
    select p_entry_id, unnest(p_rider_ids);
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.save_entry_predictions(p_entry_id uuid, p_predictions jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_game uuid;
  v_game_status text;
  v_pred jsonb;
BEGIN
  SELECT user_id, game_id INTO v_user, v_game FROM public.entries WHERE id = p_entry_id;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF v_user <> auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT status INTO v_game_status FROM public.games WHERE id = v_game;
  IF v_game_status IN ('closed','live') AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  END IF;

  DELETE FROM public.entry_predictions WHERE entry_id = p_entry_id;

  IF p_predictions IS NOT NULL AND jsonb_array_length(p_predictions) > 0 THEN
    FOR v_pred IN SELECT * FROM jsonb_array_elements(p_predictions) LOOP
      INSERT INTO public.entry_predictions (entry_id, classification, position, rider_id)
      VALUES (
        p_entry_id,
        v_pred->>'classification',
        (v_pred->>'position')::int,
        (v_pred->>'rider_id')::uuid
      );
    END LOOP;
  END IF;
END;
$function$;

-- ########## MIGRATIE: 20260502103204_3463befa-b9c3-4675-a9c8-1fc448c6c758.sql ##########

DROP VIEW IF EXISTS public.admin_user_overview;

CREATE OR REPLACE FUNCTION public.admin_user_overview()
RETURNS TABLE (
  user_id uuid,
  email text,
  created_at timestamptz,
  is_admin boolean,
  teams_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    u.created_at,
    COALESCE(p.is_admin, false) AS is_admin,
    (SELECT count(*) FROM public.entries e WHERE e.user_id = u.id) AS teams_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.admin_user_overview() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_user_overview() TO authenticated;

CREATE VIEW public.admin_user_overview
WITH (security_invoker = on) AS
SELECT * FROM public.admin_user_overview();

GRANT SELECT ON public.admin_user_overview TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ########## MIGRATIE: 20260502104836_6e968633-10f0-4a3d-924c-1a6c1e54743f.sql ##########


-- =========================================================
-- 1. Nieuwe tabel: entry_prediction_points
-- =========================================================
CREATE TABLE IF NOT EXISTS public.entry_prediction_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  classification text NOT NULL,
  position int NOT NULL,
  points int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, classification, position)
);

CREATE INDEX IF NOT EXISTS entry_prediction_points_entry_idx
  ON public.entry_prediction_points(entry_id);

ALTER TABLE public.entry_prediction_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entry_prediction_points_select ON public.entry_prediction_points;
drop policy if exists entry_prediction_points_select on public.entry_prediction_points;
CREATE POLICY entry_prediction_points_select
  ON public.entry_prediction_points
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.entries e
      WHERE e.id = entry_prediction_points.entry_id
        AND (e.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS entry_prediction_points_admin_write ON public.entry_prediction_points;
drop policy if exists entry_prediction_points_admin_write on public.entry_prediction_points;
CREATE POLICY entry_prediction_points_admin_write
  ON public.entry_prediction_points
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =========================================================
-- 2. seed_default_points_schema — nieuwe etappepunten top 20
-- =========================================================
CREATE OR REPLACE FUNCTION public.seed_default_points_schema(p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage int[] := ARRAY[50,40,32,26,22,20,18,16,14,12,10,9,8,7,6,5,4,3,2,1];
  v_pos int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- alle bestaande regels weg (oude jersey/gc-rijen vervallen)
  DELETE FROM public.points_schema WHERE game_id = p_game_id;

  FOR v_pos IN 1..array_length(v_stage,1) LOOP
    INSERT INTO public.points_schema(game_id, classification, position, points)
    VALUES (p_game_id, 'stage', v_pos, v_stage[v_pos]);
  END LOOP;
END $$;

-- =========================================================
-- 3. calculate_stage_scores — alleen top 20 finish + joker ×2
-- =========================================================
CREATE OR REPLACE FUNCTION public.calculate_stage_scores(p_stage_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_game uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT game_id INTO v_game FROM public.stages WHERE id = p_stage_id;
  IF v_game IS NULL THEN RAISE EXCEPTION 'Stage not found'; END IF;

  -- idempotent: clean slate
  DELETE FROM public.stage_points WHERE stage_id = p_stage_id;

  WITH rider_pts AS (
    SELECT
      sr.rider_id,
      COALESCE(ps.points, 0) AS pts
    FROM public.stage_results sr
    LEFT JOIN public.points_schema ps
      ON ps.game_id = v_game
     AND ps.classification = 'stage'
     AND ps.position = sr.finish_position
    WHERE sr.stage_id = p_stage_id
      AND sr.finish_position IS NOT NULL
      AND sr.finish_position BETWEEN 1 AND 20
      AND COALESCE(sr.did_finish, true) = true
  ),
  -- Punten per (entry, rider) = base × (2 als joker, anders 1)
  entry_rider_pts AS (
    SELECT
      ep.entry_id,
      ep.rider_id,
      COALESCE(rp.pts, 0) AS base_pts,
      CASE WHEN ej.rider_id IS NOT NULL THEN 2 ELSE 1 END AS mult
    FROM public.entry_picks ep
    JOIN public.entries e
      ON e.id = ep.entry_id
     AND e.game_id = v_game
     AND e.status = 'submitted'
    LEFT JOIN rider_pts rp ON rp.rider_id = ep.rider_id
    LEFT JOIN public.entry_jokers ej
      ON ej.entry_id = ep.entry_id
     AND ej.rider_id = ep.rider_id

    UNION ALL

    -- jokers die niet ook in picks staan: 2× hun stagepunten
    SELECT
      ej.entry_id,
      ej.rider_id,
      COALESCE(rp.pts, 0) AS base_pts,
      2 AS mult
    FROM public.entry_jokers ej
    JOIN public.entries e
      ON e.id = ej.entry_id
     AND e.game_id = v_game
     AND e.status = 'submitted'
    LEFT JOIN rider_pts rp ON rp.rider_id = ej.rider_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.entry_picks ep2
      WHERE ep2.entry_id = ej.entry_id
        AND ep2.rider_id = ej.rider_id
    )
  )
  INSERT INTO public.stage_points(stage_id, entry_id, points)
  SELECT p_stage_id, entry_id, SUM(base_pts * mult)::int
  FROM entry_rider_pts
  GROUP BY entry_id;
END $$;

-- =========================================================
-- 4. calculate_prediction_points
--    Podium GC: 50 / 25 (max 150) — Truien (points/kom/youth): 25
-- =========================================================
CREATE OR REPLACE FUNCTION public.calculate_prediction_points(p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_stage uuid;
  v_gc_winner uuid;
  v_gc_2 uuid;
  v_gc_3 uuid;
  v_points_winner uuid;
  v_kom_winner uuid;
  v_youth_winner uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- Wis bestaande voorspellings-bonussen voor alle entries van deze game
  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  -- Pak laatste etappe waarvoor resultaten bestaan
  SELECT s.id INTO v_last_stage
  FROM public.stages s
  WHERE s.game_id = p_game_id
    AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = s.id)
  ORDER BY s.stage_number DESC
  LIMIT 1;

  IF v_last_stage IS NULL THEN
    RETURN; -- nog geen uitslagen, niets te scoren
  END IF;

  -- Werkelijke top 3 GC + truien-winnaars
  SELECT rider_id INTO v_gc_winner
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND gc_position = 1 LIMIT 1;
  SELECT rider_id INTO v_gc_2
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND gc_position = 2 LIMIT 1;
  SELECT rider_id INTO v_gc_3
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND gc_position = 3 LIMIT 1;
  SELECT rider_id INTO v_points_winner
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND points_position = 1 LIMIT 1;
  SELECT rider_id INTO v_kom_winner
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND mountain_position = 1 LIMIT 1;
  SELECT rider_id INTO v_youth_winner
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND youth_position = 1 LIMIT 1;

  -- ----------- GC podium per entry (50 / 25 / 0, max 150) -----------
  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT
    p.entry_id,
    'gc',
    p.position,
    CASE
      WHEN p.position = 1 AND p.rider_id = v_gc_winner THEN 50
      WHEN p.position = 2 AND p.rider_id = v_gc_2      THEN 50
      WHEN p.position = 3 AND p.rider_id = v_gc_3      THEN 50
      WHEN p.rider_id IN (v_gc_winner, v_gc_2, v_gc_3)
       AND p.rider_id IS NOT NULL
       AND NOT (
         (p.position = 1 AND p.rider_id = v_gc_winner) OR
         (p.position = 2 AND p.rider_id = v_gc_2)      OR
         (p.position = 3 AND p.rider_id = v_gc_3)
       )
      THEN 25
      ELSE 0
    END AS points
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  WHERE p.classification = 'gc' AND p.position BETWEEN 1 AND 3;

  -- ----------- Truien (winnaar = 25) -----------
  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT
    p.entry_id,
    p.classification,
    1,
    CASE
      WHEN p.classification = 'points' AND p.rider_id = v_points_winner THEN 25
      WHEN p.classification = 'kom'    AND p.rider_id = v_kom_winner    THEN 25
      WHEN p.classification = 'youth'  AND p.rider_id = v_youth_winner  THEN 25
      ELSE 0
    END
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  WHERE p.classification IN ('points','kom','youth')
    AND p.position = 1;
END $$;

-- =========================================================
-- 5. update_total_ranking — telt etappes + voorspellingen
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_total_ranking(p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  INSERT INTO public.total_points(entry_id, total_points, updated_at)
  SELECT
    e.id,
    (
      COALESCE((SELECT SUM(sp.points)
                  FROM public.stage_points sp
                  JOIN public.stages s ON s.id = sp.stage_id
                 WHERE sp.entry_id = e.id AND s.game_id = p_game_id), 0)
      +
      COALESCE((SELECT SUM(epp.points)
                  FROM public.entry_prediction_points epp
                 WHERE epp.entry_id = e.id), 0)
    )::int,
    now()
  FROM public.entries e
  WHERE e.game_id = p_game_id
  ON CONFLICT (entry_id) DO UPDATE
    SET total_points = EXCLUDED.total_points,
        updated_at = now();

  UPDATE public.entries e
  SET total_points = COALESCE(tp.total_points, 0)
  FROM public.total_points tp
  WHERE tp.entry_id = e.id AND e.game_id = p_game_id;
END $$;

-- =========================================================
-- 6. full_recalculation — alles opnieuw, idempotent
-- =========================================================
CREATE OR REPLACE FUNCTION public.full_recalculation(p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_stage uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  DELETE FROM public.stage_points
  WHERE stage_id IN (SELECT id FROM public.stages WHERE game_id = p_game_id);

  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  FOR v_stage IN SELECT id FROM public.stages WHERE game_id = p_game_id LOOP
    PERFORM public.calculate_stage_scores(v_stage);
  END LOOP;

  PERFORM public.calculate_prediction_points(p_game_id);
  PERFORM public.update_total_ranking(p_game_id);
END $$;

-- =========================================================
-- 7. Grants
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.calculate_prediction_points(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.calculate_prediction_points(uuid) TO authenticated;

-- =========================================================
-- 8. Bestaande puntentabel voor alle bestaande games vervangen
--    door de nieuwe top-20 etappepunten (oude trui/gc-rijen weg)
-- =========================================================
DO $$
DECLARE g_id uuid;
BEGIN
  FOR g_id IN SELECT id FROM public.games LOOP
    DELETE FROM public.points_schema WHERE game_id = g_id;
    INSERT INTO public.points_schema(game_id, classification, position, points)
    SELECT g_id, 'stage', pos, pts
    FROM (VALUES
      (1,50),(2,40),(3,32),(4,26),(5,22),
      (6,20),(7,18),(8,16),(9,14),(10,12),
      (11,10),(12,9),(13,8),(14,7),(15,6),
      (16,5),(17,4),(18,3),(19,2),(20,1)
    ) AS v(pos,pts);
  END LOOP;
END $$;


-- ########## MIGRATIE: 20260502110323_8b1b8683-16ba-4fe9-8108-96e941f77a7c.sql ##########

-- Helper: bypass RLS om lidmaatschap te checken
CREATE OR REPLACE FUNCTION public.is_subpoule_member(_subpoule_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subpoule_members
    WHERE subpoule_id = _subpoule_id AND user_id = _user_id
  );
$$;

-- subpoules: SELECT policy via helper
DROP POLICY IF EXISTS subpoules_select ON public.subpoules;
drop policy if exists subpoules_select on public.subpoules;
CREATE POLICY subpoules_select ON public.subpoules
FOR SELECT
USING (
  owner_user_id = auth.uid()
  OR public.is_admin()
  OR public.is_subpoule_member(id, auth.uid())
);

-- subpoule_members: SELECT policy zodat leden elkaar zien
DROP POLICY IF EXISTS subpoule_members_select ON public.subpoule_members;
drop policy if exists subpoule_members_select on public.subpoule_members;
CREATE POLICY subpoule_members_select ON public.subpoule_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_admin()
  OR public.is_subpoule_member(subpoule_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.subpoules s
    WHERE s.id = subpoule_members.subpoule_id AND s.owner_user_id = auth.uid()
  )
);

-- ########## MIGRATIE: 20260502152656_9a66c3ab-9f4a-413a-845c-0c4a93285c40.sql ##########

-- Opschonen van vervuilde startlijst-data voor de actieve Giro-game
DELETE FROM public.riders WHERE game_id = 'f73a2e0f-5633-459a-b958-47babfa5678f';
DELETE FROM public.teams WHERE game_id = 'f73a2e0f-5633-459a-b958-47babfa5678f';

-- Unique constraints zodat upsert (onConflict) werkt en dubbele teams/renners voorkomen worden
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_game_name_unique;
ALTER TABLE public.teams ADD CONSTRAINT teams_game_name_unique UNIQUE (game_id, name);

ALTER TABLE public.riders DROP CONSTRAINT IF EXISTS riders_game_startnumber_unique;
ALTER TABLE public.riders ADD CONSTRAINT riders_game_startnumber_unique UNIQUE (game_id, start_number);

-- ########## MIGRATIE: 20260502154946_41773efc-c39c-4256-a1a2-9cfdaa33dead.sql ##########

-- Toggle pick: voegt rider toe of verwijdert hem; respecteert categories.max_picks
CREATE OR REPLACE FUNCTION public.toggle_entry_pick(p_entry_id uuid, p_category_id uuid, p_rider_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user uuid;
  v_game uuid;
  v_game_status text;
  v_max int;
  v_current int;
  v_exists boolean;
begin
  select user_id, game_id into v_user, v_game from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;

  select status into v_game_status from public.games where id = v_game;
  if v_game_status in ('closed','live','locked','finished') and not public.is_admin() then
    raise exception 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  end if;

  if not exists(select 1 from public.category_riders where category_id = p_category_id and rider_id = p_rider_id) then
    raise exception 'Rider does not belong to this category';
  end if;

  select coalesce(max_picks, 1) into v_max from public.categories where id = p_category_id;

  select exists(
    select 1 from public.entry_picks
    where entry_id = p_entry_id and category_id = p_category_id and rider_id = p_rider_id
  ) into v_exists;

  if v_exists then
    delete from public.entry_picks
    where entry_id = p_entry_id and category_id = p_category_id and rider_id = p_rider_id;
    return;
  end if;

  select count(*) into v_current
  from public.entry_picks
  where entry_id = p_entry_id and category_id = p_category_id;

  if v_current >= v_max then
    -- Bij 1 keuze: vervang automatisch (oude gedrag). Bij meer: weiger.
    if v_max = 1 then
      delete from public.entry_picks where entry_id = p_entry_id and category_id = p_category_id;
    else
      raise exception 'Maximaal % keuzes voor deze categorie bereikt', v_max;
    end if;
  end if;

  insert into public.entry_picks (entry_id, category_id, rider_id)
  values (p_entry_id, p_category_id, p_rider_id);
end $function$;

-- ########## MIGRATIE: 20260502160115_4c591ada-da7f-46ee-ab6d-0bd7b7fe014a.sql ##########

-- Verwijder oude UNIQUE-constraint die maar 1 pick per categorie toestond.
ALTER TABLE public.entry_picks DROP CONSTRAINT IF EXISTS entry_picks_entry_id_category_id_key;

-- Voorkom dezelfde renner dubbel in dezelfde categorie
ALTER TABLE public.entry_picks
  ADD CONSTRAINT entry_picks_entry_category_rider_unique
  UNIQUE (entry_id, category_id, rider_id);

-- ########## MIGRATIE: 20260502161532_ae1efdaf-dfab-4ef1-8206-1890f59b3e56.sql ##########

CREATE OR REPLACE FUNCTION public.submit_entry(p_entry_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_user uuid; v_game uuid; v_missing int;
begin
  select user_id, game_id into v_user, v_game from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;

  select count(*) into v_missing
  from public.categories c
  where c.game_id = v_game
    and not exists (
      select 1 from public.entry_picks ep
      where ep.entry_id = p_entry_id and ep.category_id = c.id
    );

  if v_missing > 0 then
    raise exception 'Niet alle categorieën zijn ingevuld (% nog leeg)', v_missing;
  end if;

  update public.entries set status = 'submitted', submitted_at = now() where id = p_entry_id;
end $function$;

-- ########## MIGRATIE: 20260502162615_603c3d5c-8784-49d4-bd5d-a8ae1cf7a115.sql ##########

CREATE OR REPLACE FUNCTION public.game_entries_standings(p_game_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  team_name text,
  total_points integer,
  display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.user_id,
    e.team_name,
    e.total_points,
    COALESCE(p.display_name, 'Onbekend') AS display_name
  FROM public.entries e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE auth.uid() IS NOT NULL
    AND e.game_id = p_game_id
    AND e.status = 'submitted'
  ORDER BY e.total_points DESC, COALESCE(p.display_name, e.team_name, '') ASC;
$$;

CREATE OR REPLACE FUNCTION public.subpoule_entries_detail(p_subpoule_id uuid, p_game_id uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  entry_id uuid,
  team_name text,
  total_points integer,
  picks jsonb,
  jokers jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.user_id,
    COALESCE(p.display_name, 'Onbekend') AS display_name,
    e.id AS entry_id,
    e.team_name,
    COALESCE(e.total_points, 0) AS total_points,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('category_id', ep.category_id, 'rider_id', ep.rider_id) ORDER BY ep.category_id::text, ep.created_at)
        FROM public.entry_picks ep
        WHERE ep.entry_id = e.id
      ),
      '[]'::jsonb
    ) AS picks,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('rider_id', ej.rider_id) ORDER BY ej.created_at)
        FROM public.entry_jokers ej
        WHERE ej.entry_id = e.id
      ),
      '[]'::jsonb
    ) AS jokers
  FROM public.subpoule_members m
  JOIN public.subpoules s ON s.id = m.subpoule_id
  LEFT JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN public.entries e
    ON e.user_id = m.user_id
   AND e.game_id = p_game_id
   AND e.status = 'submitted'
  WHERE m.subpoule_id = p_subpoule_id
    AND s.game_id = p_game_id
    AND (
      public.is_admin()
      OR s.owner_user_id = auth.uid()
      OR public.is_subpoule_member(p_subpoule_id, auth.uid())
    )
  ORDER BY COALESCE(e.total_points, 0) DESC, COALESCE(p.display_name, '') ASC;
$$;

-- ########## MIGRATIE: 20260502162630_65f66a00-bd9a-44e0-b8a7-83930ac3549b.sql ##########

REVOKE ALL ON FUNCTION public.game_entries_standings(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.subpoule_entries_detail(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.game_entries_standings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.subpoule_entries_detail(uuid, uuid) TO authenticated;

-- ########## MIGRATIE: 20260502163015_7565ac67-da03-4b3d-b38d-7f085c187222.sql ##########

REVOKE EXECUTE ON FUNCTION public.game_entries_standings(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.subpoule_entries_detail(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.game_entries_standings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.subpoule_entries_detail(uuid, uuid) TO authenticated;

-- ########## MIGRATIE: 20260503133342_0fac06e3-f283-4433-aac8-e4faa1043aca.sql ##########

DROP FUNCTION IF EXISTS public.subpoule_entries_detail(uuid, uuid);

CREATE OR REPLACE FUNCTION public.subpoule_entries_detail(p_subpoule_id uuid, p_game_id uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  entry_id uuid,
  team_name text,
  total_points integer,
  picks jsonb,
  jokers jsonb,
  predictions jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.user_id,
    COALESCE(p.display_name, 'Onbekend') AS display_name,
    e.id AS entry_id,
    e.team_name,
    COALESCE(e.total_points, 0) AS total_points,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('category_id', ep.category_id, 'rider_id', ep.rider_id) ORDER BY ep.category_id::text, ep.created_at)
       FROM public.entry_picks ep WHERE ep.entry_id = e.id),
      '[]'::jsonb
    ) AS picks,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('rider_id', ej.rider_id) ORDER BY ej.created_at)
       FROM public.entry_jokers ej WHERE ej.entry_id = e.id),
      '[]'::jsonb
    ) AS jokers,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('classification', epr.classification, 'position', epr.position, 'rider_id', epr.rider_id) ORDER BY epr.classification, epr.position)
       FROM public.entry_predictions epr WHERE epr.entry_id = e.id),
      '[]'::jsonb
    ) AS predictions
  FROM public.subpoule_members m
  JOIN public.subpoules s ON s.id = m.subpoule_id
  LEFT JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN public.entries e
    ON e.user_id = m.user_id
   AND e.game_id = p_game_id
   AND e.status = 'submitted'
  WHERE m.subpoule_id = p_subpoule_id
    AND s.game_id = p_game_id
    AND (
      public.is_admin()
      OR s.owner_user_id = auth.uid()
      OR public.is_subpoule_member(p_subpoule_id, auth.uid())
    )
  ORDER BY COALESCE(e.total_points, 0) DESC, COALESCE(p.display_name, '') ASC;
$$;

REVOKE ALL ON FUNCTION public.subpoule_entries_detail(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.subpoule_entries_detail(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.subpoule_entries_detail(uuid, uuid) TO authenticated;

-- ########## MIGRATIE: 20260503153917_329e94a0-b808-4a5b-a0f5-e06aab9fdf64.sql ##########

drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select
  to authenticated
  using (auth.uid() is not null);

-- ########## MIGRATIE: 20260503154200_56c90b4a-e8e9-4b0f-a320-809aeac7997c.sql ##########

alter table public.chat_messages
  drop constraint if exists chat_body_max_len;
alter table public.chat_messages
  add constraint chat_body_max_len check (char_length(body) <= 2000);

-- ########## MIGRATIE: 20260503172033_aa87c872-8cda-4e00-9236-966f563f1f7b.sql ##########

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS registration_opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS registration_closes_at timestamptz;

-- ########## MIGRATIE: 20260503181354_21476b9c-17fc-48d4-bd30-b51b8ce4498f.sql ##########

DELETE FROM public.teams
WHERE game_id = 'f73a2e0f-5633-459a-b958-47babfa5678f'
  AND NOT EXISTS (SELECT 1 FROM public.riders r WHERE r.team_id = teams.id);

-- ########## MIGRATIE: 20260504061956_fd35ca89-91a8-4dbc-b850-c003b01a508c.sql ##########

DELETE FROM public.user_roles WHERE role='admin' AND user_id IN (SELECT id FROM auth.users WHERE email <> 'koerspoule@gmail.com');
UPDATE public.profiles SET is_admin=false WHERE id IN (SELECT id FROM auth.users WHERE email <> 'koerspoule@gmail.com');

-- ########## MIGRATIE: 20260504062307_6caaf36a-e1d3-4450-9f06-a420c4e44ed4.sql ##########

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    NEW.is_admin := OLD.is_admin;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- ########## MIGRATIE: 20260504193226_b70987af-0edf-445e-ac34-fe98679af39c.sql ##########

CREATE OR REPLACE FUNCTION public.toggle_entry_pick(p_entry_id uuid, p_category_id uuid, p_rider_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid;
  v_game uuid;
  v_game_status text;
  v_max int;
  v_current int;
  v_exists boolean;
  v_other_cat_name text;
  v_rider_name text;
begin
  select user_id, game_id into v_user, v_game from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;

  select status into v_game_status from public.games where id = v_game;
  if v_game_status in ('closed','live','locked','finished') and not public.is_admin() then
    raise exception 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  end if;

  if not exists(select 1 from public.category_riders where category_id = p_category_id and rider_id = p_rider_id) then
    raise exception 'Rider does not belong to this category';
  end if;

  select coalesce(max_picks, 1) into v_max from public.categories where id = p_category_id;

  select exists(
    select 1 from public.entry_picks
    where entry_id = p_entry_id and category_id = p_category_id and rider_id = p_rider_id
  ) into v_exists;

  if v_exists then
    delete from public.entry_picks
    where entry_id = p_entry_id and category_id = p_category_id and rider_id = p_rider_id;
    return;
  end if;

  -- Check of deze renner al in een andere categorie van dezelfde inzending staat
  select c.name into v_other_cat_name
  from public.entry_picks ep
  join public.categories c on c.id = ep.category_id
  where ep.entry_id = p_entry_id
    and ep.rider_id = p_rider_id
    and ep.category_id <> p_category_id
  limit 1;

  if v_other_cat_name is not null then
    select name into v_rider_name from public.riders where id = p_rider_id;
    raise exception 'Deze renner (%) zit al in categorie "%". Verwijder hem daar eerst.', coalesce(v_rider_name, 'onbekend'), v_other_cat_name;
  end if;

  -- Check of deze renner al joker is
  if exists(select 1 from public.entry_jokers where entry_id = p_entry_id and rider_id = p_rider_id) then
    select name into v_rider_name from public.riders where id = p_rider_id;
    raise exception 'Deze renner (%) is al gekozen als joker. Verwijder de joker eerst.', coalesce(v_rider_name, 'onbekend');
  end if;

  select count(*) into v_current
  from public.entry_picks
  where entry_id = p_entry_id and category_id = p_category_id;

  if v_current >= v_max then
    if v_max = 1 then
      delete from public.entry_picks where entry_id = p_entry_id and category_id = p_category_id;
    else
      raise exception 'Maximaal % keuzes voor deze categorie bereikt', v_max;
    end if;
  end if;

  insert into public.entry_picks (entry_id, category_id, rider_id)
  values (p_entry_id, p_category_id, p_rider_id);
end $function$;

-- ########## MIGRATIE: 20260504193948_1efbee0b-eaec-486d-aea0-de1bdcb0343b.sql ##########

-- Clean up stale/cross-race picks before tightening validation.
DELETE FROM public.entry_picks ep
USING public.entries e, public.categories c, public.riders r
LEFT JOIN public.teams t ON t.id = r.team_id
WHERE ep.entry_id = e.id
  AND ep.category_id = c.id
  AND ep.rider_id = r.id
  AND (
    c.game_id <> e.game_id
    OR COALESCE(t.game_id, e.game_id) <> e.game_id
    OR NOT EXISTS (
      SELECT 1
      FROM public.category_riders cr
      WHERE cr.category_id = ep.category_id
        AND cr.rider_id = ep.rider_id
    )
  );

DELETE FROM public.entry_jokers ej
USING public.entries e, public.riders r
LEFT JOIN public.teams t ON t.id = r.team_id
WHERE ej.entry_id = e.id
  AND ej.rider_id = r.id
  AND (
    t.id IS NULL
    OR t.game_id <> e.game_id
    OR EXISTS (
      SELECT 1
      FROM public.entry_picks ep
      WHERE ep.entry_id = ej.entry_id
        AND ep.rider_id = ej.rider_id
    )
  );

DELETE FROM public.entry_predictions pr
USING public.entries e, public.riders r
LEFT JOIN public.teams t ON t.id = r.team_id
WHERE pr.entry_id = e.id
  AND pr.rider_id = r.id
  AND (
    t.id IS NULL
    OR t.game_id <> e.game_id
  );

CREATE OR REPLACE FUNCTION public.toggle_entry_pick(p_entry_id uuid, p_category_id uuid, p_rider_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid;
  v_game uuid;
  v_game_status text;
  v_max int;
  v_current int;
  v_exists boolean;
  v_other_cat_name text;
  v_rider_name text;
begin
  select user_id, game_id into v_user, v_game from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;

  select status into v_game_status from public.games where id = v_game;
  if v_game_status in ('closed','live','locked','finished') and not public.is_admin() then
    raise exception 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  end if;

  select coalesce(max_picks, 1) into v_max
  from public.categories
  where id = p_category_id
    and game_id = v_game;

  if v_max is null then
    raise exception 'Deze categorie hoort niet bij deze koers. Vernieuw de pagina en probeer opnieuw.';
  end if;

  if not exists (
    select 1
    from public.category_riders cr
    join public.riders r on r.id = cr.rider_id
    join public.teams t on t.id = r.team_id
    where cr.category_id = p_category_id
      and cr.rider_id = p_rider_id
      and t.game_id = v_game
  ) then
    raise exception 'Deze renner hoort niet in deze Giro 2026-categorie. Kies een renner uit deze kaart.';
  end if;

  select exists(
    select 1 from public.entry_picks
    where entry_id = p_entry_id and category_id = p_category_id and rider_id = p_rider_id
  ) into v_exists;

  if v_exists then
    delete from public.entry_picks
    where entry_id = p_entry_id and category_id = p_category_id and rider_id = p_rider_id;
    return;
  end if;

  select c.name into v_other_cat_name
  from public.entry_picks ep
  join public.categories c on c.id = ep.category_id
  where ep.entry_id = p_entry_id
    and ep.rider_id = p_rider_id
    and ep.category_id <> p_category_id
  limit 1;

  if v_other_cat_name is not null then
    select name into v_rider_name from public.riders where id = p_rider_id;
    raise exception 'Deze renner (%) zit al in categorie "%". Verwijder hem daar eerst.', coalesce(v_rider_name, 'onbekend'), v_other_cat_name;
  end if;

  if exists(select 1 from public.entry_jokers where entry_id = p_entry_id and rider_id = p_rider_id) then
    select name into v_rider_name from public.riders where id = p_rider_id;
    raise exception 'Deze renner (%) is al gekozen als joker. Verwijder de joker eerst.', coalesce(v_rider_name, 'onbekend');
  end if;

  select count(*) into v_current
  from public.entry_picks
  where entry_id = p_entry_id and category_id = p_category_id;

  if v_current >= v_max then
    if v_max = 1 then
      delete from public.entry_picks where entry_id = p_entry_id and category_id = p_category_id;
    else
      raise exception 'Deze categorie is al compleet (%/%). Verwijder eerst een renner uit dit waaiergroepje.', v_current, v_max;
    end if;
  end if;

  insert into public.entry_picks (entry_id, category_id, rider_id)
  values (p_entry_id, p_category_id, p_rider_id);
end $function$;

CREATE OR REPLACE FUNCTION public.save_entry_pick(p_entry_id uuid, p_category_id uuid, p_rider_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid;
  v_game uuid;
  v_game_status text;
begin
  select user_id, game_id into v_user, v_game from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;

  select status into v_game_status from public.games where id = v_game;
  if v_game_status in ('closed','live','locked','finished') and not public.is_admin() then
    raise exception 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  end if;

  if not exists(select 1 from public.categories where id = p_category_id and game_id = v_game) then
    raise exception 'Deze categorie hoort niet bij deze koers. Vernieuw de pagina en probeer opnieuw.';
  end if;

  if not exists (
    select 1
    from public.category_riders cr
    join public.riders r on r.id = cr.rider_id
    join public.teams t on t.id = r.team_id
    where cr.category_id = p_category_id
      and cr.rider_id = p_rider_id
      and t.game_id = v_game
  ) then
    raise exception 'Deze renner hoort niet in deze categorie.';
  end if;

  if exists(select 1 from public.entry_jokers where entry_id = p_entry_id and rider_id = p_rider_id) then
    raise exception 'Deze renner is al gekozen als joker. Verwijder de joker eerst.';
  end if;

  delete from public.entry_picks where entry_id = p_entry_id and category_id = p_category_id;
  insert into public.entry_picks (entry_id, category_id, rider_id) values (p_entry_id, p_category_id, p_rider_id);
end $function$;

CREATE OR REPLACE FUNCTION public.save_entry_jokers(p_entry_id uuid, p_rider_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid;
  v_game uuid;
  v_game_status text;
  v_distinct_count int;
begin
  select user_id, game_id into v_user, v_game from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;

  select status into v_game_status from public.games where id = v_game;
  if v_game_status in ('closed','live','locked','finished') and not public.is_admin() then
    raise exception 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  end if;

  if array_length(p_rider_ids, 1) > 2 then raise exception 'Maximum 2 jokers'; end if;

  select count(distinct x.rider_id) into v_distinct_count
  from unnest(coalesce(p_rider_ids, array[]::uuid[])) as x(rider_id);

  if v_distinct_count <> coalesce(array_length(p_rider_ids, 1), 0) then
    raise exception 'Jokers moeten uniek zijn';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_rider_ids, array[]::uuid[])) as x(rider_id)
    left join public.riders r on r.id = x.rider_id
    left join public.teams t on t.id = r.team_id
    where t.id is null or t.game_id <> v_game
  ) then
    raise exception 'Een joker moet uit de startlijst van deze koers komen.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_rider_ids, array[]::uuid[])) as x(rider_id)
    join public.entry_picks ep on ep.entry_id = p_entry_id and ep.rider_id = x.rider_id
  ) then
    raise exception 'Een joker mag niet al in je categorieploeg zitten.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_rider_ids, array[]::uuid[])) as x(rider_id)
    join public.category_riders cr on cr.rider_id = x.rider_id
    join public.categories c on c.id = cr.category_id and c.game_id = v_game
  ) then
    raise exception 'Jokers komen uit de overige renners, niet uit een categorie.';
  end if;

  delete from public.entry_jokers where entry_id = p_entry_id;
  if p_rider_ids is not null and array_length(p_rider_ids, 1) > 0 then
    insert into public.entry_jokers (entry_id, rider_id)
    select p_entry_id, unnest(p_rider_ids);
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.save_entry_predictions(p_entry_id uuid, p_predictions jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_game uuid;
  v_game_status text;
  v_pred jsonb;
  v_rider uuid;
BEGIN
  SELECT user_id, game_id INTO v_user, v_game FROM public.entries WHERE id = p_entry_id;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF v_user <> auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT status INTO v_game_status FROM public.games WHERE id = v_game;
  IF v_game_status IN ('closed','live','locked','finished') AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  END IF;

  DELETE FROM public.entry_predictions WHERE entry_id = p_entry_id;

  IF p_predictions IS NOT NULL AND jsonb_array_length(p_predictions) > 0 THEN
    FOR v_pred IN SELECT * FROM jsonb_array_elements(p_predictions) LOOP
      v_rider := (v_pred->>'rider_id')::uuid;

      IF NOT EXISTS (
        SELECT 1
        FROM public.riders r
        JOIN public.teams t ON t.id = r.team_id
        WHERE r.id = v_rider
          AND t.game_id = v_game
      ) THEN
        RAISE EXCEPTION 'Een voorspelde renner hoort niet bij deze koers.';
      END IF;

      INSERT INTO public.entry_predictions (entry_id, classification, position, rider_id)
      VALUES (
        p_entry_id,
        v_pred->>'classification',
        (v_pred->>'position')::int,
        v_rider
      );
    END LOOP;
  END IF;
END;
$function$;

-- ########## MIGRATIE: 20260504194130_219b95e8-a485-4414-83b3-7518944de662.sql ##########

REVOKE EXECUTE ON FUNCTION public.toggle_entry_pick(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_entry_pick(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_entry_jokers(uuid, uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_entry_predictions(uuid, jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.toggle_entry_pick(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_entry_pick(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_entry_jokers(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_entry_predictions(uuid, jsonb) TO authenticated;

-- ########## MIGRATIE: 20260505151157_email_infra.sql ##########

-- Email infrastructure
-- Creates the queue system, send log, send state, suppression, and unsubscribe
-- tables used by both auth and transactional emails.

-- Extensions required for queue processing
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create email queues (auth = high priority, transactional = normal)
-- Wrapped in DO blocks to handle "queue already exists" errors idempotently.
DO $$ BEGIN PERFORM pgmq.create('auth_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Dead-letter queues for messages that exceed max retries
DO $$ BEGIN PERFORM pgmq.create('auth_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Email send log table (audit trail for all send attempts)
-- UPDATE is allowed for the service role so the suppression edge function
-- can update a log record's status when a bounce/complaint/unsubscribe occurs.
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  drop policy if exists "Service role can read send log" on public.email_send_log;
  CREATE POLICY "Service role can read send log"
    ON public.email_send_log FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  drop policy if exists "Service role can insert send log" on public.email_send_log;
  CREATE POLICY "Service role can insert send log"
    ON public.email_send_log FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  drop policy if exists "Service role can update send log" on public.email_send_log;
  CREATE POLICY "Service role can update send log"
    ON public.email_send_log FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);

-- Backfill: add message_id column to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_log ADD COLUMN message_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log(message_id);

-- Prevent duplicate sends: only one 'sent' row per message_id.
-- If VT expires and another worker picks up the same message, the pre-send
-- check catches it. This index is a DB-level safety net for race conditions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique
  ON public.email_send_log(message_id) WHERE status = 'sent';

-- Backfill: update status CHECK constraint for existing tables that predate new statuses
DO $$ BEGIN
  ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check;
  ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check
    CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq'));
END $$;

-- Rate-limit state and queue config (single row, tracks Retry-After cooldown + throughput settings)
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until TIMESTAMPTZ,
  batch_size INTEGER NOT NULL DEFAULT 10,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Backfill: add config columns to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN batch_size INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN send_delay_ms INTEGER NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  drop policy if exists "Service role can manage send state" on public.email_send_state;
  CREATE POLICY "Service role can manage send state"
    ON public.email_send_state FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RPC wrappers so Edge Functions can interact with pgmq via supabase.rpc()
-- (PostgREST only exposes functions in the public schema; pgmq functions are in the pgmq schema)
-- All wrappers auto-create the queue on undefined_table (42P01) so emails
-- are never lost if the queue was dropped (extension upgrade, restore, etc.).
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name TEXT, batch_size INT, vt INT)
RETURNS TABLE(msg_id BIGINT, read_ct INT, message JSONB)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name TEXT, message_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue TEXT, dlq_name TEXT, message_id BIGINT, payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;

-- Restrict queue RPC wrappers to service_role only (SECURITY DEFINER runs as owner,
-- so without this any authenticated user could manipulate the email queues)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) TO service_role;

-- Suppressed emails table (tracks unsubscribes, bounces, complaints)
-- Append-only: no DELETE or UPDATE policies to prevent bypassing suppression.
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  drop policy if exists "Service role can read suppressed emails" on public.suppressed_emails;
  CREATE POLICY "Service role can read suppressed emails"
    ON public.suppressed_emails FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  drop policy if exists "Service role can insert suppressed emails" on public.suppressed_emails;
  CREATE POLICY "Service role can insert suppressed emails"
    ON public.suppressed_emails FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email);

-- Email unsubscribe tokens table (one token per email address for unsubscribe links)
-- No DELETE policy to prevent removing tokens. UPDATE allowed only to mark tokens as used.
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  drop policy if exists "Service role can read tokens" on public.email_unsubscribe_tokens;
  CREATE POLICY "Service role can read tokens"
    ON public.email_unsubscribe_tokens FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  drop policy if exists "Service role can insert tokens" on public.email_unsubscribe_tokens;
  CREATE POLICY "Service role can insert tokens"
    ON public.email_unsubscribe_tokens FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  drop policy if exists "Service role can mark tokens as used" on public.email_unsubscribe_tokens;
  CREATE POLICY "Service role can mark tokens as used"
    ON public.email_unsubscribe_tokens FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);

-- ============================================================
-- POST-MIGRATION STEPS (applied dynamically by setup_email_infra)
-- These steps contain project-specific secrets and URLs and
-- cannot be expressed as static SQL. They are applied via the
-- Supabase Management API (ExecuteSQL) each time the tool runs.
-- ============================================================
--
-- 1. VAULT SECRET
--    Stores (or updates) the Supabase service_role key in
--    vault as 'email_queue_service_role_key'.
--    Uses vault.create_secret / vault.update_secret (upsert).
--    To revert: DELETE FROM vault.secrets WHERE name = 'email_queue_service_role_key';
--
-- 2. CRON JOB (pg_cron)
--    Creates job 'process-email-queue' with a 5-second interval.
--    The job checks:
--      a) rate-limit cooldown (email_send_state.retry_after_until)
--      b) whether auth_emails or transactional_emails queues have messages
--    If conditions are met, it calls the process-email-queue Edge Function
--    via net.http_post using the vault-stored service_role key.
--    To revert: SELECT cron.unschedule('process-email-queue');


-- ########## MIGRATIE: 20260505151524_aa2de0ba-5b32-4f80-beb9-6042528957f7.sql ##########


CREATE OR REPLACE FUNCTION public.admin_delete_user_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'Je kunt jezelf niet verwijderen'; END IF;

  DELETE FROM public.entry_picks WHERE entry_id IN (SELECT id FROM public.entries WHERE user_id = p_user_id);
  DELETE FROM public.entry_jokers WHERE entry_id IN (SELECT id FROM public.entries WHERE user_id = p_user_id);
  DELETE FROM public.entry_predictions WHERE entry_id IN (SELECT id FROM public.entries WHERE user_id = p_user_id);
  DELETE FROM public.entry_prediction_points WHERE entry_id IN (SELECT id FROM public.entries WHERE user_id = p_user_id);
  DELETE FROM public.stage_points WHERE entry_id IN (SELECT id FROM public.entries WHERE user_id = p_user_id);
  DELETE FROM public.total_points WHERE entry_id IN (SELECT id FROM public.entries WHERE user_id = p_user_id);
  DELETE FROM public.entries WHERE user_id = p_user_id;

  DELETE FROM public.chat_messages WHERE user_id = p_user_id;
  DELETE FROM public.subpoule_members WHERE user_id = p_user_id;
  -- subpoules waar deze user owner is: cleanup members + chat + subpoule
  DELETE FROM public.subpoule_members WHERE subpoule_id IN (SELECT id FROM public.subpoules WHERE owner_user_id = p_user_id);
  DELETE FROM public.chat_messages WHERE subpoule_id IN (SELECT id FROM public.subpoules WHERE owner_user_id = p_user_id);
  DELETE FROM public.subpoules WHERE owner_user_id = p_user_id;

  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_entry(p_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.entry_picks WHERE entry_id = p_entry_id;
  DELETE FROM public.entry_jokers WHERE entry_id = p_entry_id;
  DELETE FROM public.entry_predictions WHERE entry_id = p_entry_id;
  DELETE FROM public.entry_prediction_points WHERE entry_id = p_entry_id;
  DELETE FROM public.stage_points WHERE entry_id = p_entry_id;
  DELETE FROM public.total_points WHERE entry_id = p_entry_id;
  DELETE FROM public.entries WHERE id = p_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_entry_status(p_entry_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_status NOT IN ('draft','submitted') THEN RAISE EXCEPTION 'Ongeldige status'; END IF;
  UPDATE public.entries
     SET status = p_status,
         submitted_at = CASE WHEN p_status = 'submitted' THEN COALESCE(submitted_at, now()) ELSE NULL END
   WHERE id = p_entry_id;
END;
$$;


-- ########## MIGRATIE: 20260505153649_321311db-2664-4236-800c-4f9ad623172e.sql ##########

CREATE TABLE IF NOT EXISTS public.notify_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  source text DEFAULT 'homepage'
);

ALTER TABLE public.notify_subscribers ENABLE ROW LEVEL SECURITY;

drop policy if exists notify_subscribers_admin_all on public.notify_subscribers;
CREATE POLICY notify_subscribers_admin_all ON public.notify_subscribers
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.subscribe_notify(p_email text, p_source text DEFAULT 'homepage')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_email text;
BEGIN
  v_email := lower(trim(p_email));
  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Ongeldig e-mailadres';
  END IF;
  INSERT INTO public.notify_subscribers (email, source)
  VALUES (v_email, COALESCE(p_source, 'homepage'))
  ON CONFLICT (email) DO UPDATE SET unsubscribed_at = NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.subscribe_notify(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_notify_subscribers()
RETURNS TABLE(id uuid, email text, created_at timestamptz, unsubscribed_at timestamptz, source text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, email, created_at, unsubscribed_at, source
  FROM public.notify_subscribers
  WHERE public.is_admin()
  ORDER BY created_at DESC;
$$;

-- ########## MIGRATIE: 20260505170729_0050e51e-3443-420a-90a8-169b29e41cb3.sql ##########


-- 1. Status & audit columns on stages
ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS results_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_for_approval_at timestamptz;

-- "Steun de kopgroep"-banner per etappe — 100% HANDMATIG via de admin-toggle.
-- Default uit; geen enkele trigger/functie zet 'm ooit automatisch aan.
ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS support_banner_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS support_banner_updated_at timestamptz;

ALTER TABLE public.stages
  DROP CONSTRAINT IF EXISTS stages_results_status_check;
ALTER TABLE public.stages
  ADD CONSTRAINT stages_results_status_check
  CHECK (results_status IN ('draft','pending','approved'));

-- Auto-mark stages that already have any results as 'approved' (preserve current visibility)
UPDATE public.stages s
SET results_status = 'approved',
    approved_at = COALESCE(approved_at, now())
WHERE results_status = 'draft'
  AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = s.id);

-- 2. Audit log table
CREATE TABLE IF NOT EXISTS public.results_approval_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('submitted','approved','revoked','reverted_to_draft')),
  actor_user_id uuid,
  actor_display_name text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_results_approval_log_stage ON public.results_approval_log(stage_id, created_at DESC);

ALTER TABLE public.results_approval_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "approval_log_admin_all" ON public.results_approval_log;
drop policy if exists "approval_log_admin_all" on public.results_approval_log;
CREATE POLICY "approval_log_admin_all" ON public.results_approval_log
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. RLS gating: non-admin can only see results/points for approved stages
DROP POLICY IF EXISTS read_stage_results ON public.stage_results;
drop policy if exists read_stage_results on public.stage_results;
CREATE POLICY read_stage_results ON public.stage_results
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.stages s
        WHERE s.id = stage_results.stage_id AND s.results_status = 'approved'
      )
    )
  );

DROP POLICY IF EXISTS read_stage_points ON public.stage_points;
drop policy if exists read_stage_points on public.stage_points;
CREATE POLICY read_stage_points ON public.stage_points
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.stages s
        WHERE s.id = stage_points.stage_id AND s.results_status = 'approved'
      )
    )
  );

-- 4. RPCs
CREATE OR REPLACE FUNCTION public.submit_stage_for_approval(p_stage_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor_name text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stage_results WHERE stage_id = p_stage_id) THEN
    RAISE EXCEPTION 'Geen uitslag ingevuld voor deze etappe';
  END IF;
  UPDATE public.stages
     SET results_status = 'pending',
         submitted_for_approval_at = now()
   WHERE id = p_stage_id;
  SELECT display_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.results_approval_log(stage_id, action, actor_user_id, actor_display_name)
    VALUES (p_stage_id, 'submitted', auth.uid(), v_actor_name);
END $$;

CREATE OR REPLACE FUNCTION public.approve_stage_results(p_stage_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_game uuid;
  v_actor_name text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT game_id INTO v_game FROM public.stages WHERE id = p_stage_id;
  IF v_game IS NULL THEN RAISE EXCEPTION 'Stage not found'; END IF;

  UPDATE public.stages
     SET results_status = 'approved',
         approved_by = auth.uid(),
         approved_at = now()
   WHERE id = p_stage_id;

  PERFORM public.calculate_stage_scores(p_stage_id);
  PERFORM public.calculate_prediction_points(v_game);
  PERFORM public.update_total_ranking(v_game);

  SELECT display_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.results_approval_log(stage_id, action, actor_user_id, actor_display_name)
    VALUES (p_stage_id, 'approved', auth.uid(), v_actor_name);
END $$;

CREATE OR REPLACE FUNCTION public.revoke_stage_approval(p_stage_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_game uuid;
  v_actor_name text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT game_id INTO v_game FROM public.stages WHERE id = p_stage_id;
  UPDATE public.stages
     SET results_status = 'pending',
         approved_by = NULL,
         approved_at = NULL
   WHERE id = p_stage_id;
  -- Wis stagepunten zodat totalen niet meer meetellen
  DELETE FROM public.stage_points WHERE stage_id = p_stage_id;
  IF v_game IS NOT NULL THEN
    PERFORM public.update_total_ranking(v_game);
  END IF;
  SELECT display_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.results_approval_log(stage_id, action, actor_user_id, actor_display_name)
    VALUES (p_stage_id, 'revoked', auth.uid(), v_actor_name);
END $$;

CREATE OR REPLACE FUNCTION public.revert_stage_to_draft(p_stage_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor_name text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.stages SET results_status = 'draft', submitted_for_approval_at = NULL
   WHERE id = p_stage_id AND results_status = 'pending';
  SELECT display_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.results_approval_log(stage_id, action, actor_user_id, actor_display_name)
    VALUES (p_stage_id, 'reverted_to_draft', auth.uid(), v_actor_name);
END $$;

-- 5. Update full_recalculation to only include approved stages
CREATE OR REPLACE FUNCTION public.full_recalculation(p_game_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_stage uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  DELETE FROM public.stage_points
  WHERE stage_id IN (SELECT id FROM public.stages WHERE game_id = p_game_id);

  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  FOR v_stage IN
    SELECT id FROM public.stages
    WHERE game_id = p_game_id AND results_status = 'approved'
  LOOP
    PERFORM public.calculate_stage_scores(v_stage);
  END LOOP;

  PERFORM public.calculate_prediction_points(p_game_id);
  PERFORM public.update_total_ranking(p_game_id);
END $$;

-- 6. Admin overview RPC for pending stages
CREATE OR REPLACE FUNCTION public.admin_pending_approvals(p_game_id uuid)
RETURNS TABLE(
  stage_id uuid,
  stage_number int,
  stage_name text,
  stage_date date,
  results_status text,
  submitted_for_approval_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  approved_by_name text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.stage_number, s.name, s.date, s.results_status,
         s.submitted_for_approval_at, s.approved_by, s.approved_at,
         p.display_name
  FROM public.stages s
  LEFT JOIN public.profiles p ON p.id = s.approved_by
  WHERE public.is_admin()
    AND s.game_id = p_game_id
    AND s.results_status IN ('pending','draft','approved')
  ORDER BY
    CASE s.results_status WHEN 'pending' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
    s.stage_number;
$$;


-- ########## MIGRATIE: 20260507063615_da5f0d6d-904a-41fb-8cfb-86748590fdd2.sql ##########

ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS is_youth_eligible boolean NOT NULL DEFAULT false;

-- ########## MIGRATIE: 20260507071057_80c97786-ec6f-4916-ab72-2781c5ea11b2.sql ##########


-- 1) Uitslag van één etappe wissen
CREATE OR REPLACE FUNCTION public.delete_stage_results(p_stage_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_game uuid;
  v_actor_name text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT game_id INTO v_game FROM public.stages WHERE id = p_stage_id;
  IF v_game IS NULL THEN RAISE EXCEPTION 'Stage not found'; END IF;

  DELETE FROM public.stage_points WHERE stage_id = p_stage_id;
  DELETE FROM public.stage_results WHERE stage_id = p_stage_id;

  UPDATE public.stages
     SET results_status = 'draft',
         submitted_for_approval_at = NULL,
         approved_by = NULL,
         approved_at = NULL
   WHERE id = p_stage_id;

  PERFORM public.update_total_ranking(v_game);

  SELECT display_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.results_approval_log(stage_id, action, actor_user_id, actor_display_name)
    VALUES (p_stage_id, 'results_deleted', auth.uid(), v_actor_name);
END $$;

-- 2) Puntenopbouw per deelnemer voor één etappe
CREATE OR REPLACE FUNCTION public.admin_stage_points_breakdown(p_stage_id uuid)
RETURNS TABLE(
  entry_id uuid,
  team_name text,
  display_name text,
  total_stage_points integer,
  breakdown jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH game AS (
    SELECT game_id FROM public.stages WHERE id = p_stage_id
  ),
  rider_pts AS (
    SELECT
      sr.rider_id,
      sr.finish_position,
      COALESCE(sr.did_finish, true) AS did_finish,
      COALESCE(ps.points, 0) AS pts
    FROM public.stage_results sr
    LEFT JOIN public.points_schema ps
      ON ps.game_id = (SELECT game_id FROM game)
     AND ps.classification = 'stage'
     AND ps.position = sr.finish_position
    WHERE sr.stage_id = p_stage_id
  ),
  -- alle (entry, rider) combinaties: picks + jokers (joker overschrijft mult naar 2)
  entry_riders AS (
    SELECT ep.entry_id, ep.rider_id,
           CASE WHEN ej.rider_id IS NOT NULL THEN 2 ELSE 1 END AS mult,
           (ej.rider_id IS NOT NULL) AS is_joker
    FROM public.entry_picks ep
    JOIN public.entries e ON e.id = ep.entry_id
                         AND e.game_id = (SELECT game_id FROM game)
                         AND e.status = 'submitted'
    LEFT JOIN public.entry_jokers ej
      ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id

    UNION ALL

    SELECT ej.entry_id, ej.rider_id, 2 AS mult, true AS is_joker
    FROM public.entry_jokers ej
    JOIN public.entries e ON e.id = ej.entry_id
                         AND e.game_id = (SELECT game_id FROM game)
                         AND e.status = 'submitted'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.entry_picks ep2
      WHERE ep2.entry_id = ej.entry_id AND ep2.rider_id = ej.rider_id
    )
  ),
  rows AS (
    SELECT
      er.entry_id,
      er.rider_id,
      r.name AS rider_name,
      rp.finish_position,
      COALESCE(rp.pts, 0) AS base_pts,
      er.is_joker,
      er.mult,
      CASE
        WHEN rp.finish_position IS NOT NULL
         AND rp.finish_position BETWEEN 1 AND 20
         AND rp.did_finish
        THEN COALESCE(rp.pts, 0) * er.mult
        ELSE 0
      END AS total
    FROM entry_riders er
    LEFT JOIN public.riders r ON r.id = er.rider_id
    LEFT JOIN rider_pts rp ON rp.rider_id = er.rider_id
  )
  SELECT
    e.id AS entry_id,
    e.team_name,
    COALESCE(p.display_name, 'Onbekend') AS display_name,
    COALESCE(SUM(rows.total)::int, 0) AS total_stage_points,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'rider_id', rows.rider_id,
          'rider_name', rows.rider_name,
          'finish_position', rows.finish_position,
          'base_pts', rows.base_pts,
          'is_joker', rows.is_joker,
          'multiplier', rows.mult,
          'total', rows.total
        )
        ORDER BY rows.total DESC NULLS LAST, rows.rider_name
      ) FILTER (WHERE rows.rider_id IS NOT NULL),
      '[]'::jsonb
    ) AS breakdown
  FROM public.entries e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  LEFT JOIN rows ON rows.entry_id = e.id
  WHERE public.is_admin()
    AND e.game_id = (SELECT game_id FROM game)
    AND e.status = 'submitted'
  GROUP BY e.id, e.team_name, p.display_name
  ORDER BY total_stage_points DESC, COALESCE(p.display_name, '');
$$;


-- ########## MIGRATIE: 20260508070350_91ddc904-43ae-426e-a821-dd0da59f408c.sql ##########


-- Pick counts per (category, rider) for a given game, only from submitted entries
CREATE OR REPLACE FUNCTION public.game_pick_stats(p_game_id uuid)
RETURNS TABLE(category_id uuid, rider_id uuid, pick_count integer, total_entries integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH submitted AS (
    SELECT id FROM entries WHERE game_id = p_game_id AND status = 'submitted'
  ),
  total AS (SELECT count(*)::int AS n FROM submitted)
  SELECT ep.category_id,
         ep.rider_id,
         count(*)::int AS pick_count,
         (SELECT n FROM total) AS total_entries
  FROM entry_picks ep
  JOIN submitted s ON s.id = ep.entry_id
  GROUP BY ep.category_id, ep.rider_id;
$$;

GRANT EXECUTE ON FUNCTION public.game_pick_stats(uuid) TO authenticated;

-- Joker counts per rider
CREATE OR REPLACE FUNCTION public.game_joker_stats(p_game_id uuid)
RETURNS TABLE(rider_id uuid, joker_count integer, total_entries integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH submitted AS (
    SELECT id FROM entries WHERE game_id = p_game_id AND status = 'submitted'
  ),
  total AS (SELECT count(*)::int AS n FROM submitted)
  SELECT ej.rider_id,
         count(*)::int AS joker_count,
         (SELECT n FROM total) AS total_entries
  FROM entry_jokers ej
  JOIN submitted s ON s.id = ej.entry_id
  GROUP BY ej.rider_id;
$$;

GRANT EXECUTE ON FUNCTION public.game_joker_stats(uuid) TO authenticated;

-- Anonymous total points per submitted entry (for percentile calc)
CREATE OR REPLACE FUNCTION public.game_entry_totals(p_game_id uuid)
RETURNS TABLE(total_points integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(total_points, 0)::int
  FROM entries
  WHERE game_id = p_game_id AND status = 'submitted';
$$;

GRANT EXECUTE ON FUNCTION public.game_entry_totals(uuid) TO authenticated;


-- ########## MIGRATIE: 20260508074606_68d2a03f-9393-47fc-bf2d-b2729739e466.sql ##########

-- Open public read access to reference data so non-authenticated visitors
-- can preview the rules and team builder when a game is in open registration.

-- games
DROP POLICY IF EXISTS read_games ON public.games;
drop policy if exists read_games on public.games;
CREATE POLICY read_games ON public.games FOR SELECT USING (true);

-- categories
DROP POLICY IF EXISTS read_categories ON public.categories;
drop policy if exists read_categories on public.categories;
CREATE POLICY read_categories ON public.categories FOR SELECT USING (true);

-- category_riders
DROP POLICY IF EXISTS read_category_riders ON public.category_riders;
drop policy if exists read_category_riders on public.category_riders;
CREATE POLICY read_category_riders ON public.category_riders FOR SELECT USING (true);

-- riders
DROP POLICY IF EXISTS read_riders ON public.riders;
drop policy if exists read_riders on public.riders;
CREATE POLICY read_riders ON public.riders FOR SELECT USING (true);

-- teams
DROP POLICY IF EXISTS read_teams ON public.teams;
drop policy if exists read_teams on public.teams;
CREATE POLICY read_teams ON public.teams FOR SELECT USING (true);

-- game_riders
DROP POLICY IF EXISTS read_game_riders ON public.game_riders;
drop policy if exists read_game_riders on public.game_riders;
CREATE POLICY read_game_riders ON public.game_riders FOR SELECT USING (true);

-- points_schema
DROP POLICY IF EXISTS read_points_schema ON public.points_schema;
drop policy if exists read_points_schema on public.points_schema;
CREATE POLICY read_points_schema ON public.points_schema FOR SELECT USING (true);

-- startlists
DROP POLICY IF EXISTS read_startlists ON public.startlists;
drop policy if exists read_startlists on public.startlists;
CREATE POLICY read_startlists ON public.startlists FOR SELECT USING (true);

-- stages
DROP POLICY IF EXISTS read_stages ON public.stages;
drop policy if exists read_stages on public.stages;
CREATE POLICY read_stages ON public.stages FOR SELECT USING (true);


-- ########## MIGRATIE: 20260509064346_f43892c6-0e8a-41c7-aa06-3bc7e3f1a499.sql ##########

CREATE OR REPLACE FUNCTION public.game_prediction_stats(p_game_id uuid)
 RETURNS TABLE(classification text, "position" int, rider_id uuid, pick_count int, total_entries int)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH submitted AS (
    SELECT id FROM entries WHERE game_id = p_game_id AND status = 'submitted'
  ),
  total AS (SELECT count(*)::int AS n FROM submitted)
  SELECT ep.classification,
         ep.position,
         ep.rider_id,
         count(*)::int AS pick_count,
         (SELECT n FROM total) AS total_entries
  FROM entry_predictions ep
  JOIN submitted s ON s.id = ep.entry_id
  GROUP BY ep.classification, ep.position, ep.rider_id;
$function$;

GRANT EXECUTE ON FUNCTION public.game_prediction_stats(uuid) TO anon, authenticated;

-- ########## MIGRATIE: 20260510081721_dd4c33fa-3500-45b5-b0f6-3f21ed9157d8.sql ##########

CREATE OR REPLACE FUNCTION public.calculate_prediction_points(p_game_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last_stage uuid;
  v_final_stage_number integer;
  v_gc_winner uuid;
  v_gc_2 uuid;
  v_gc_3 uuid;
  v_points_winner uuid;
  v_kom_winner uuid;
  v_youth_winner uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- Wis bestaande voorspellings-bonussen voor alle entries van deze game.
  -- Bonussen worden pas opnieuw geplaatst zodra de einduitslag bekend is.
  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  SELECT max(stage_number) INTO v_final_stage_number
  FROM public.stages
  WHERE game_id = p_game_id;

  SELECT id INTO v_last_stage
  FROM public.stages
  WHERE game_id = p_game_id
    AND stage_number = v_final_stage_number
    AND results_status = 'approved'
    AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = stages.id)
  LIMIT 1;

  IF v_last_stage IS NULL THEN
    RETURN;
  END IF;

  -- Werkelijke eindstand: top 3 GC + truien-winnaars na de laatste etappe.
  SELECT rider_id INTO v_gc_winner
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND gc_position = 1 LIMIT 1;
  SELECT rider_id INTO v_gc_2
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND gc_position = 2 LIMIT 1;
  SELECT rider_id INTO v_gc_3
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND gc_position = 3 LIMIT 1;
  SELECT rider_id INTO v_points_winner
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND points_position = 1 LIMIT 1;
  SELECT rider_id INTO v_kom_winner
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND mountain_position = 1 LIMIT 1;
  SELECT rider_id INTO v_youth_winner
    FROM public.stage_results
   WHERE stage_id = v_last_stage AND youth_position = 1 LIMIT 1;

  -- ----------- GC podium per entry (50 exact / 25 in podium, max 150) -----------
  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT
    p.entry_id,
    'gc',
    p.position,
    CASE
      WHEN p.position = 1 AND p.rider_id = v_gc_winner THEN 50
      WHEN p.position = 2 AND p.rider_id = v_gc_2      THEN 50
      WHEN p.position = 3 AND p.rider_id = v_gc_3      THEN 50
      WHEN p.rider_id IN (v_gc_winner, v_gc_2, v_gc_3)
       AND p.rider_id IS NOT NULL
       AND NOT (
         (p.position = 1 AND p.rider_id = v_gc_winner) OR
         (p.position = 2 AND p.rider_id = v_gc_2)      OR
         (p.position = 3 AND p.rider_id = v_gc_3)
       )
      THEN 25
      ELSE 0
    END AS points
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  WHERE p.classification = 'gc' AND p.position BETWEEN 1 AND 3;

  -- ----------- Truien (winnaar = 25) -----------
  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT
    p.entry_id,
    p.classification,
    1,
    CASE
      WHEN p.classification = 'points' AND p.rider_id = v_points_winner THEN 25
      WHEN p.classification = 'kom'    AND p.rider_id = v_kom_winner    THEN 25
      WHEN p.classification = 'youth'  AND p.rider_id = v_youth_winner  THEN 25
      ELSE 0
    END
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  WHERE p.classification IN ('points','kom','youth')
    AND p.position = 1;
END $function$;

WITH non_final_games AS (
  SELECT g.id AS game_id
  FROM public.games g
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.stages s
    WHERE s.game_id = g.id
      AND s.stage_number = (SELECT max(s2.stage_number) FROM public.stages s2 WHERE s2.game_id = g.id)
      AND s.results_status = 'approved'
      AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = s.id)
  )
), affected_entries AS (
  SELECT e.id, e.game_id
  FROM public.entries e
  JOIN non_final_games nfg ON nfg.game_id = e.game_id
), deleted AS (
  DELETE FROM public.entry_prediction_points epp
  USING affected_entries ae
  WHERE epp.entry_id = ae.id
  RETURNING epp.entry_id
), recalculated AS (
  SELECT
    ae.id AS entry_id,
    COALESCE((
      SELECT SUM(sp.points)
      FROM public.stage_points sp
      JOIN public.stages s ON s.id = sp.stage_id
      WHERE sp.entry_id = ae.id
        AND s.game_id = ae.game_id
        AND s.results_status = 'approved'
    ), 0)::int AS total_points
  FROM affected_entries ae
)
INSERT INTO public.total_points(entry_id, total_points, updated_at)
SELECT entry_id, total_points, now()
FROM recalculated
ON CONFLICT (entry_id) DO UPDATE
  SET total_points = EXCLUDED.total_points,
      updated_at = now();

UPDATE public.entries e
SET total_points = COALESCE(tp.total_points, 0),
    updated_at = now()
FROM public.total_points tp
WHERE tp.entry_id = e.id
  AND e.game_id IN (
    SELECT g.id
    FROM public.games g
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.stages s
      WHERE s.game_id = g.id
        AND s.stage_number = (SELECT max(s2.stage_number) FROM public.stages s2 WHERE s2.game_id = g.id)
        AND s.results_status = 'approved'
        AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = s.id)
    )
  );

-- ########## MIGRATIE: 20260510151319_008194c1-4fbf-4732-9504-419b10704002.sql ##########

DO $$
DECLARE
  v_stage uuid := '786831a5-46c1-4ae7-ac42-1fea58451c34';
  v_game uuid;
  v_admin uuid := '8a212a2a-f8bb-4c66-b423-9c1c8bf9ceab';
BEGIN
  SELECT game_id INTO v_game FROM public.stages WHERE id = v_stage;

  UPDATE public.stages
     SET results_status = 'approved',
         approved_by = v_admin,
         approved_at = now(),
         submitted_for_approval_at = COALESCE(submitted_for_approval_at, now())
   WHERE id = v_stage;

  DELETE FROM public.stage_points WHERE stage_id = v_stage;

  WITH rider_pts AS (
    SELECT sr.rider_id, COALESCE(ps.points, 0) AS pts
    FROM public.stage_results sr
    LEFT JOIN public.points_schema ps
      ON ps.game_id = v_game
     AND ps.classification = 'stage'
     AND ps.position = sr.finish_position
    WHERE sr.stage_id = v_stage
      AND sr.finish_position BETWEEN 1 AND 20
      AND COALESCE(sr.did_finish, true) = true
  ),
  entry_rider_pts AS (
    SELECT ep.entry_id, ep.rider_id, COALESCE(rp.pts,0) AS base_pts,
           CASE WHEN ej.rider_id IS NOT NULL THEN 2 ELSE 1 END AS mult
    FROM public.entry_picks ep
    JOIN public.entries e ON e.id = ep.entry_id AND e.game_id = v_game AND e.status='submitted'
    LEFT JOIN rider_pts rp ON rp.rider_id = ep.rider_id
    LEFT JOIN public.entry_jokers ej ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
    UNION ALL
    SELECT ej.entry_id, ej.rider_id, COALESCE(rp.pts,0) AS base_pts, 2 AS mult
    FROM public.entry_jokers ej
    JOIN public.entries e ON e.id = ej.entry_id AND e.game_id = v_game AND e.status='submitted'
    LEFT JOIN rider_pts rp ON rp.rider_id = ej.rider_id
    WHERE NOT EXISTS (SELECT 1 FROM public.entry_picks ep2 WHERE ep2.entry_id = ej.entry_id AND ep2.rider_id = ej.rider_id)
  )
  INSERT INTO public.stage_points(stage_id, entry_id, points)
  SELECT v_stage, entry_id, SUM(base_pts*mult)::int
  FROM entry_rider_pts
  GROUP BY entry_id;

  INSERT INTO public.total_points(entry_id, total_points, updated_at)
  SELECT e.id,
         (COALESCE((SELECT SUM(sp.points) FROM public.stage_points sp
                     JOIN public.stages s ON s.id=sp.stage_id
                    WHERE sp.entry_id=e.id AND s.game_id=v_game),0)
        + COALESCE((SELECT SUM(epp.points) FROM public.entry_prediction_points epp
                    WHERE epp.entry_id=e.id),0))::int,
         now()
  FROM public.entries e
  WHERE e.game_id = v_game
  ON CONFLICT (entry_id) DO UPDATE
    SET total_points = EXCLUDED.total_points, updated_at = now();

  UPDATE public.entries e
     SET total_points = COALESCE(tp.total_points,0)
    FROM public.total_points tp
   WHERE tp.entry_id = e.id AND e.game_id = v_game;

  INSERT INTO public.results_approval_log(stage_id, action, actor_user_id, actor_display_name)
  VALUES (v_stage, 'approved', v_admin, 'koerspoule (handmatig via support)');
END $$;

-- ########## MIGRATIE: 20260510171929_90210366-cf16-4b41-a422-3494c8da1928.sql ##########

-- Refresh total_points for active Giro 2026 game (stage points only; predictions still 0 until final stage)
DO $$
DECLARE v_game uuid;
BEGIN
  SELECT id INTO v_game FROM public.games WHERE game_type='giro' AND year=2026 LIMIT 1;
  IF v_game IS NULL THEN RETURN; END IF;

  INSERT INTO public.total_points(entry_id, total_points, updated_at)
  SELECT
    e.id,
    (
      COALESCE((SELECT SUM(sp.points)
                  FROM public.stage_points sp
                  JOIN public.stages s ON s.id = sp.stage_id
                 WHERE sp.entry_id = e.id AND s.game_id = v_game), 0)
      +
      COALESCE((SELECT SUM(epp.points)
                  FROM public.entry_prediction_points epp
                 WHERE epp.entry_id = e.id), 0)
    )::int,
    now()
  FROM public.entries e
  WHERE e.game_id = v_game
  ON CONFLICT (entry_id) DO UPDATE
    SET total_points = EXCLUDED.total_points, updated_at = now();

  UPDATE public.entries e
  SET total_points = COALESCE(tp.total_points, 0)
  FROM public.total_points tp
  WHERE tp.entry_id = e.id AND e.game_id = v_game;
END $$;

-- ########## MIGRATIE: 20260511154850_0b1455ad-4bbf-4020-b415-2a1d717607cf.sql ##########


CREATE OR REPLACE FUNCTION public.subpoule_benchmark_data(p_subpoule_id uuid, p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_authorized boolean;
  v_result jsonb;
  v_entries jsonb;
  v_stages jsonb;
  v_categories jsonb;
  v_stage_points jsonb;
  v_category_points jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;

  SELECT (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = p_subpoule_id AND s.owner_user_id = auth.uid())
    OR public.is_subpoule_member(p_subpoule_id, auth.uid())
  ) INTO v_authorized;
  IF NOT v_authorized THEN RAISE EXCEPTION 'Geen toegang tot deze subpoule'; END IF;

  -- Entries (members of subpoule with submitted entry in this game)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', m.user_id,
    'display_name', COALESCE(p.display_name, 'Onbekend'),
    'entry_id', e.id,
    'team_name', e.team_name,
    'total_points', COALESCE(e.total_points, 0)
  ) ORDER BY COALESCE(e.total_points,0) DESC), '[]'::jsonb)
  INTO v_entries
  FROM public.subpoule_members m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN public.entries e ON e.user_id = m.user_id AND e.game_id = p_game_id AND e.status = 'submitted'
  WHERE m.subpoule_id = p_subpoule_id;

  -- Approved stages with results
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'stage_number', s.stage_number,
    'name', s.name,
    'date', s.date,
    'approved_at', s.approved_at
  ) ORDER BY s.stage_number), '[]'::jsonb)
  INTO v_stages
  FROM public.stages s
  WHERE s.game_id = p_game_id
    AND s.results_status = 'approved'
    AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = s.id);

  -- Categories
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'short_name', c.short_name,
    'sort_order', c.sort_order
  ) ORDER BY c.sort_order, c.name), '[]'::jsonb)
  INTO v_categories
  FROM public.categories c
  WHERE c.game_id = p_game_id;

  -- Stage points per entry per stage (only approved stages)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'entry_id', sp.entry_id,
    'stage_id', sp.stage_id,
    'points', sp.points
  )), '[]'::jsonb)
  INTO v_stage_points
  FROM public.stage_points sp
  JOIN public.stages s ON s.id = sp.stage_id
  WHERE s.game_id = p_game_id
    AND s.results_status = 'approved'
    AND sp.entry_id IN (
      SELECT e.id FROM public.entries e
      JOIN public.subpoule_members m ON m.user_id = e.user_id
      WHERE m.subpoule_id = p_subpoule_id AND e.game_id = p_game_id
    );

  -- Category points per entry per category (sum across approved stages)
  -- Logic mirrors calculate_stage_scores: rider stage points × (2 if joker else 1)
  WITH approved_stages AS (
    SELECT id FROM public.stages
    WHERE game_id = p_game_id AND results_status = 'approved'
  ),
  rider_stage_pts AS (
    SELECT sr.stage_id, sr.rider_id, COALESCE(ps.points, 0) AS pts
    FROM public.stage_results sr
    JOIN approved_stages s ON s.id = sr.stage_id
    LEFT JOIN public.points_schema ps
      ON ps.game_id = p_game_id
     AND ps.classification = 'stage'
     AND ps.position = sr.finish_position
    WHERE sr.finish_position BETWEEN 1 AND 20
      AND COALESCE(sr.did_finish, true) = true
  ),
  sub_entries AS (
    SELECT e.id AS entry_id
    FROM public.entries e
    JOIN public.subpoule_members m ON m.user_id = e.user_id
    WHERE m.subpoule_id = p_subpoule_id
      AND e.game_id = p_game_id
      AND e.status = 'submitted'
  ),
  cat_pts AS (
    SELECT
      ep.entry_id,
      ep.category_id,
      SUM(rsp.pts * CASE WHEN ej.rider_id IS NOT NULL THEN 2 ELSE 1 END)::int AS points
    FROM public.entry_picks ep
    JOIN sub_entries se ON se.entry_id = ep.entry_id
    JOIN rider_stage_pts rsp ON rsp.rider_id = ep.rider_id
    LEFT JOIN public.entry_jokers ej
      ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
    GROUP BY ep.entry_id, ep.category_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'entry_id', entry_id,
    'category_id', category_id,
    'points', points
  )), '[]'::jsonb)
  INTO v_category_points
  FROM cat_pts;

  v_result := jsonb_build_object(
    'entries', v_entries,
    'stages', v_stages,
    'categories', v_categories,
    'stage_points', v_stage_points,
    'category_points', v_category_points
  );
  RETURN v_result;
END;
$$;


-- ########## MIGRATIE: 20260511155953_82120787-1e74-43e4-bbe4-3339a3ec88c6.sql ##########


-- Updated: include picks (rider names) per entry per category
CREATE OR REPLACE FUNCTION public.subpoule_benchmark_data(p_subpoule_id uuid, p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_authorized boolean;
  v_entries jsonb;
  v_stages jsonb;
  v_categories jsonb;
  v_stage_points jsonb;
  v_category_points jsonb;
  v_picks jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;

  SELECT (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = p_subpoule_id AND s.owner_user_id = auth.uid())
    OR public.is_subpoule_member(p_subpoule_id, auth.uid())
  ) INTO v_authorized;
  IF NOT v_authorized THEN RAISE EXCEPTION 'Geen toegang tot deze subpoule'; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', m.user_id,
    'display_name', COALESCE(p.display_name, 'Onbekend'),
    'entry_id', e.id,
    'team_name', e.team_name,
    'total_points', COALESCE(e.total_points, 0)
  ) ORDER BY COALESCE(e.total_points,0) DESC), '[]'::jsonb)
  INTO v_entries
  FROM public.subpoule_members m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN public.entries e ON e.user_id = m.user_id AND e.game_id = p_game_id AND e.status = 'submitted'
  WHERE m.subpoule_id = p_subpoule_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id, 'stage_number', s.stage_number, 'name', s.name,
    'date', s.date, 'approved_at', s.approved_at
  ) ORDER BY s.stage_number), '[]'::jsonb)
  INTO v_stages
  FROM public.stages s
  WHERE s.game_id = p_game_id AND s.results_status = 'approved'
    AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = s.id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'short_name', c.short_name, 'sort_order', c.sort_order
  ) ORDER BY c.sort_order, c.name), '[]'::jsonb)
  INTO v_categories
  FROM public.categories c WHERE c.game_id = p_game_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'entry_id', sp.entry_id, 'stage_id', sp.stage_id, 'points', sp.points
  )), '[]'::jsonb)
  INTO v_stage_points
  FROM public.stage_points sp
  JOIN public.stages s ON s.id = sp.stage_id
  WHERE s.game_id = p_game_id AND s.results_status = 'approved'
    AND sp.entry_id IN (
      SELECT e.id FROM public.entries e
      JOIN public.subpoule_members m ON m.user_id = e.user_id
      WHERE m.subpoule_id = p_subpoule_id AND e.game_id = p_game_id
    );

  WITH approved_stages AS (
    SELECT id FROM public.stages WHERE game_id = p_game_id AND results_status = 'approved'
  ),
  rider_stage_pts AS (
    SELECT sr.stage_id, sr.rider_id, COALESCE(ps.points, 0) AS pts
    FROM public.stage_results sr
    JOIN approved_stages s ON s.id = sr.stage_id
    LEFT JOIN public.points_schema ps
      ON ps.game_id = p_game_id AND ps.classification = 'stage' AND ps.position = sr.finish_position
    WHERE sr.finish_position BETWEEN 1 AND 20 AND COALESCE(sr.did_finish, true) = true
  ),
  sub_entries AS (
    SELECT e.id AS entry_id FROM public.entries e
    JOIN public.subpoule_members m ON m.user_id = e.user_id
    WHERE m.subpoule_id = p_subpoule_id AND e.game_id = p_game_id AND e.status = 'submitted'
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'entry_id', entry_id, 'category_id', category_id, 'points', points
  )), '[]'::jsonb)
  INTO v_category_points
  FROM (
    SELECT ep.entry_id, ep.category_id,
      SUM(rsp.pts * CASE WHEN ej.rider_id IS NOT NULL THEN 2 ELSE 1 END)::int AS points
    FROM public.entry_picks ep
    JOIN sub_entries se ON se.entry_id = ep.entry_id
    JOIN rider_stage_pts rsp ON rsp.rider_id = ep.rider_id
    LEFT JOIN public.entry_jokers ej ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
    GROUP BY ep.entry_id, ep.category_id
  ) cp;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'entry_id', ep.entry_id,
    'category_id', ep.category_id,
    'rider_id', ep.rider_id,
    'rider_name', r.name,
    'country_code', r.country_code,
    'is_joker', (ej.rider_id IS NOT NULL)
  )), '[]'::jsonb)
  INTO v_picks
  FROM public.entry_picks ep
  JOIN public.entries e ON e.id = ep.entry_id
  JOIN public.subpoule_members m ON m.user_id = e.user_id
  LEFT JOIN public.riders r ON r.id = ep.rider_id
  LEFT JOIN public.entry_jokers ej ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
  WHERE m.subpoule_id = p_subpoule_id AND e.game_id = p_game_id AND e.status = 'submitted';

  RETURN jsonb_build_object(
    'entries', v_entries, 'stages', v_stages, 'categories', v_categories,
    'stage_points', v_stage_points, 'category_points', v_category_points,
    'picks', COALESCE(v_picks, '[]'::jsonb)
  );
END;
$$;

-- New: global benchmark across all submitted entries in a game
CREATE OR REPLACE FUNCTION public.game_benchmark_data(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entries jsonb;
  v_stages jsonb;
  v_categories jsonb;
  v_stage_points jsonb;
  v_category_points jsonb;
  v_picks jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', e.user_id,
    'display_name', COALESCE(p.display_name, 'Onbekend'),
    'entry_id', e.id,
    'team_name', e.team_name,
    'total_points', COALESCE(e.total_points, 0)
  ) ORDER BY COALESCE(e.total_points,0) DESC), '[]'::jsonb)
  INTO v_entries
  FROM public.entries e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE e.game_id = p_game_id AND e.status = 'submitted';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id, 'stage_number', s.stage_number, 'name', s.name,
    'date', s.date, 'approved_at', s.approved_at
  ) ORDER BY s.stage_number), '[]'::jsonb)
  INTO v_stages
  FROM public.stages s
  WHERE s.game_id = p_game_id AND s.results_status = 'approved'
    AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = s.id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'short_name', c.short_name, 'sort_order', c.sort_order
  ) ORDER BY c.sort_order, c.name), '[]'::jsonb)
  INTO v_categories
  FROM public.categories c WHERE c.game_id = p_game_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'entry_id', sp.entry_id, 'stage_id', sp.stage_id, 'points', sp.points
  )), '[]'::jsonb)
  INTO v_stage_points
  FROM public.stage_points sp
  JOIN public.stages s ON s.id = sp.stage_id
  JOIN public.entries e ON e.id = sp.entry_id
  WHERE s.game_id = p_game_id AND s.results_status = 'approved'
    AND e.game_id = p_game_id AND e.status = 'submitted';

  WITH approved_stages AS (
    SELECT id FROM public.stages WHERE game_id = p_game_id AND results_status = 'approved'
  ),
  rider_stage_pts AS (
    SELECT sr.stage_id, sr.rider_id, COALESCE(ps.points, 0) AS pts
    FROM public.stage_results sr
    JOIN approved_stages s ON s.id = sr.stage_id
    LEFT JOIN public.points_schema ps
      ON ps.game_id = p_game_id AND ps.classification = 'stage' AND ps.position = sr.finish_position
    WHERE sr.finish_position BETWEEN 1 AND 20 AND COALESCE(sr.did_finish, true) = true
  ),
  game_entries AS (
    SELECT id AS entry_id FROM public.entries WHERE game_id = p_game_id AND status = 'submitted'
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'entry_id', entry_id, 'category_id', category_id, 'points', points
  )), '[]'::jsonb)
  INTO v_category_points
  FROM (
    SELECT ep.entry_id, ep.category_id,
      SUM(rsp.pts * CASE WHEN ej.rider_id IS NOT NULL THEN 2 ELSE 1 END)::int AS points
    FROM public.entry_picks ep
    JOIN game_entries ge ON ge.entry_id = ep.entry_id
    JOIN rider_stage_pts rsp ON rsp.rider_id = ep.rider_id
    LEFT JOIN public.entry_jokers ej ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
    GROUP BY ep.entry_id, ep.category_id
  ) cp;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'entry_id', ep.entry_id,
    'category_id', ep.category_id,
    'rider_id', ep.rider_id,
    'rider_name', r.name,
    'country_code', r.country_code,
    'is_joker', (ej.rider_id IS NOT NULL)
  )), '[]'::jsonb)
  INTO v_picks
  FROM public.entry_picks ep
  JOIN public.entries e ON e.id = ep.entry_id
  LEFT JOIN public.riders r ON r.id = ep.rider_id
  LEFT JOIN public.entry_jokers ej ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id
  WHERE e.game_id = p_game_id AND e.status = 'submitted';

  RETURN jsonb_build_object(
    'entries', v_entries, 'stages', v_stages, 'categories', v_categories,
    'stage_points', v_stage_points, 'category_points', v_category_points,
    'picks', COALESCE(v_picks, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.game_benchmark_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.subpoule_benchmark_data(uuid, uuid) TO authenticated;


-- ########## MIGRATIE: 20260511161548_af7437dd-41a6-4881-8d9e-5906a174d87a.sql ##########


-- 1. Uitbreidingen op chat_messages
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS mentions uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS chat_messages_subpoule_created_idx
  ON public.chat_messages (subpoule_id, created_at DESC);

-- Allow UPDATE on own messages (was forbidden before)
DROP POLICY IF EXISTS chat_messages_update_own ON public.chat_messages;
drop policy if exists chat_messages_update_own on public.chat_messages;
CREATE POLICY chat_messages_update_own ON public.chat_messages
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 2. chat_read_states
CREATE TABLE IF NOT EXISTS public.chat_read_states (
  subpoule_id uuid NOT NULL,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subpoule_id, user_id)
);
ALTER TABLE public.chat_read_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_read_states_select ON public.chat_read_states;
drop policy if exists chat_read_states_select on public.chat_read_states;
CREATE POLICY chat_read_states_select ON public.chat_read_states
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS chat_read_states_upsert ON public.chat_read_states;
drop policy if exists chat_read_states_upsert on public.chat_read_states;
CREATE POLICY chat_read_states_upsert ON public.chat_read_states
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS chat_read_states_update ON public.chat_read_states;
drop policy if exists chat_read_states_update on public.chat_read_states;
CREATE POLICY chat_read_states_update ON public.chat_read_states
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. chat_message_reactions
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_reactions_select ON public.chat_message_reactions;
drop policy if exists chat_reactions_select on public.chat_message_reactions;
CREATE POLICY chat_reactions_select ON public.chat_message_reactions
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = chat_message_reactions.message_id
        AND (
          m.subpoule_id IS NULL
          OR public.is_admin()
          OR public.is_subpoule_member(m.subpoule_id, auth.uid())
          OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = m.subpoule_id AND s.owner_user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS chat_reactions_insert ON public.chat_message_reactions;
drop policy if exists chat_reactions_insert on public.chat_message_reactions;
CREATE POLICY chat_reactions_insert ON public.chat_message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = chat_message_reactions.message_id
        AND (
          m.subpoule_id IS NULL
          OR public.is_admin()
          OR public.is_subpoule_member(m.subpoule_id, auth.uid())
          OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = m.subpoule_id AND s.owner_user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS chat_reactions_delete ON public.chat_message_reactions;
drop policy if exists chat_reactions_delete on public.chat_message_reactions;
CREATE POLICY chat_reactions_delete ON public.chat_message_reactions
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- 4. chat_polls + chat_poll_votes
CREATE TABLE IF NOT EXISTS public.chat_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subpoule_id uuid NOT NULL,
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,
  deadline timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_polls_select ON public.chat_polls;
drop policy if exists chat_polls_select on public.chat_polls;
CREATE POLICY chat_polls_select ON public.chat_polls
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      public.is_admin()
      OR public.is_subpoule_member(subpoule_id, auth.uid())
      OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = chat_polls.subpoule_id AND s.owner_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS chat_polls_insert ON public.chat_polls;
drop policy if exists chat_polls_insert on public.chat_polls;
CREATE POLICY chat_polls_insert ON public.chat_polls
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND (
      public.is_admin()
      OR public.is_subpoule_member(subpoule_id, auth.uid())
      OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = chat_polls.subpoule_id AND s.owner_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS chat_polls_delete ON public.chat_polls;
drop policy if exists chat_polls_delete on public.chat_polls;
CREATE POLICY chat_polls_delete ON public.chat_polls
  FOR DELETE USING (created_by = auth.uid() OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.chat_poll_votes (
  poll_id uuid NOT NULL REFERENCES public.chat_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_index int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);
ALTER TABLE public.chat_poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_poll_votes_select ON public.chat_poll_votes;
drop policy if exists chat_poll_votes_select on public.chat_poll_votes;
CREATE POLICY chat_poll_votes_select ON public.chat_poll_votes
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chat_polls p
      WHERE p.id = chat_poll_votes.poll_id
        AND (
          public.is_admin()
          OR public.is_subpoule_member(p.subpoule_id, auth.uid())
          OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = p.subpoule_id AND s.owner_user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS chat_poll_votes_insert ON public.chat_poll_votes;
drop policy if exists chat_poll_votes_insert on public.chat_poll_votes;
CREATE POLICY chat_poll_votes_insert ON public.chat_poll_votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.chat_polls p
      WHERE p.id = chat_poll_votes.poll_id
        AND (p.deadline IS NULL OR p.deadline > now())
        AND (
          public.is_admin()
          OR public.is_subpoule_member(p.subpoule_id, auth.uid())
          OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = p.subpoule_id AND s.owner_user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS chat_poll_votes_delete ON public.chat_poll_votes;
drop policy if exists chat_poll_votes_delete on public.chat_poll_votes;
CREATE POLICY chat_poll_votes_delete ON public.chat_poll_votes
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- 5. RPC's

-- Mark subpoule as read
CREATE OR REPLACE FUNCTION public.mark_subpoule_read(p_subpoule_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  INSERT INTO public.chat_read_states (subpoule_id, user_id, last_read_at, updated_at)
  VALUES (p_subpoule_id, auth.uid(), now(), now())
  ON CONFLICT (subpoule_id, user_id)
  DO UPDATE SET last_read_at = now(), updated_at = now();
END $$;

-- Unread counts per subpoule for this user (for a given game)
CREATE OR REPLACE FUNCTION public.subpoule_unread_counts(p_game_id uuid)
RETURNS TABLE(subpoule_id uuid, unread_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH my_subs AS (
    SELECT s.id, s.owner_user_id
    FROM public.subpoules s
    WHERE s.game_id = p_game_id
      AND (s.owner_user_id = auth.uid() OR public.is_subpoule_member(s.id, auth.uid()))
  ),
  reads AS (
    SELECT subpoule_id, last_read_at FROM public.chat_read_states WHERE user_id = auth.uid()
  )
  SELECT ms.id AS subpoule_id,
    COALESCE((
      SELECT count(*)::int FROM public.chat_messages m
      WHERE m.subpoule_id = ms.id
        AND m.user_id <> auth.uid()
        AND m.deleted_at IS NULL
        AND (m.created_at > COALESCE((SELECT last_read_at FROM reads r WHERE r.subpoule_id = ms.id), 'epoch'::timestamptz))
    ), 0)
  FROM my_subs ms;
$$;

-- Edit own message
CREATE OR REPLACE FUNCTION public.edit_chat_message(p_message_id uuid, p_body text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN RAISE EXCEPTION 'Leeg bericht'; END IF;
  IF length(p_body) > 2000 THEN RAISE EXCEPTION 'Bericht te lang'; END IF;
  SELECT user_id INTO v_owner FROM public.chat_messages WHERE id = p_message_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Bericht niet gevonden'; END IF;
  IF v_owner <> auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'Niet toegestaan'; END IF;
  UPDATE public.chat_messages
     SET body = p_body, edited_at = now()
   WHERE id = p_message_id AND deleted_at IS NULL;
END $$;

-- Soft delete
CREATE OR REPLACE FUNCTION public.soft_delete_chat_message(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  SELECT user_id INTO v_owner FROM public.chat_messages WHERE id = p_message_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Bericht niet gevonden'; END IF;
  IF v_owner <> auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'Niet toegestaan'; END IF;
  UPDATE public.chat_messages
     SET deleted_at = now(), body = ''
   WHERE id = p_message_id;
END $$;

-- Toggle reaction
CREATE OR REPLACE FUNCTION public.toggle_chat_reaction(p_message_id uuid, p_emoji text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_existing uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  IF p_emoji IS NULL OR length(p_emoji) = 0 OR length(p_emoji) > 16 THEN RAISE EXCEPTION 'Ongeldige emoji'; END IF;
  SELECT id INTO v_existing FROM public.chat_message_reactions
   WHERE message_id = p_message_id AND user_id = auth.uid() AND emoji = p_emoji;
  IF v_existing IS NOT NULL THEN
    DELETE FROM public.chat_message_reactions WHERE id = v_existing;
  ELSE
    INSERT INTO public.chat_message_reactions(message_id, user_id, emoji)
    VALUES (p_message_id, auth.uid(), p_emoji);
  END IF;
END $$;

-- Create poll (also creates a chat_messages row tying it to the chat stream)
CREATE OR REPLACE FUNCTION public.create_chat_poll(
  p_subpoule_id uuid, p_game_id uuid, p_question text, p_options jsonb, p_deadline timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_msg uuid; v_poll uuid; v_count int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  IF p_question IS NULL OR length(trim(p_question)) < 3 THEN RAISE EXCEPTION 'Vraag te kort'; END IF;
  IF length(p_question) > 200 THEN RAISE EXCEPTION 'Vraag te lang'; END IF;
  IF jsonb_typeof(p_options) <> 'array' THEN RAISE EXCEPTION 'Opties moeten een lijst zijn'; END IF;
  v_count := jsonb_array_length(p_options);
  IF v_count < 2 OR v_count > 6 THEN RAISE EXCEPTION 'Tussen 2 en 6 opties'; END IF;
  IF NOT (
    public.is_admin()
    OR public.is_subpoule_member(p_subpoule_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.subpoules s WHERE s.id = p_subpoule_id AND s.owner_user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Geen toegang tot deze subpoule';
  END IF;

  INSERT INTO public.chat_messages(subpoule_id, game_id, user_id, body)
  VALUES (p_subpoule_id, p_game_id, auth.uid(), '[poll]')
  RETURNING id INTO v_msg;

  INSERT INTO public.chat_polls(subpoule_id, message_id, question, options, deadline, created_by)
  VALUES (p_subpoule_id, v_msg, trim(p_question), p_options, p_deadline, auth.uid())
  RETURNING id INTO v_poll;

  RETURN v_poll;
END $$;

-- Cast vote (one per user; toggling allowed by replacing)
CREATE OR REPLACE FUNCTION public.cast_chat_poll_vote(p_poll_id uuid, p_option_index int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_deadline timestamptz; v_count int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  SELECT deadline, jsonb_array_length(options) INTO v_deadline, v_count
    FROM public.chat_polls WHERE id = p_poll_id;
  IF v_count IS NULL THEN RAISE EXCEPTION 'Poll niet gevonden'; END IF;
  IF v_deadline IS NOT NULL AND v_deadline <= now() THEN RAISE EXCEPTION 'Poll is gesloten'; END IF;
  IF p_option_index < 0 OR p_option_index >= v_count THEN RAISE EXCEPTION 'Ongeldige optie'; END IF;
  INSERT INTO public.chat_poll_votes(poll_id, user_id, option_index)
  VALUES (p_poll_id, auth.uid(), p_option_index)
  ON CONFLICT (poll_id, user_id) DO UPDATE SET option_index = EXCLUDED.option_index, created_at = now();
END $$;

-- 6. Realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_polls;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_poll_votes;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_message_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.chat_polls REPLICA IDENTITY FULL;
ALTER TABLE public.chat_poll_votes REPLICA IDENTITY FULL;


-- ########## MIGRATIE: 20260511164609_deb62852-2ebf-4676-a891-598a37cbc878.sql ##########

ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS distance_km integer,
  ADD COLUMN IF NOT EXISTS is_gc boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS stages_one_gc_per_game
  ON public.stages (game_id) WHERE is_gc = true;

-- ########## MIGRATIE: 20260512175352_b45090af-ba4f-4551-bf43-3167030d291d.sql ##########

ALTER TABLE public.games ADD COLUMN IF NOT EXISTS joker_multiplier integer NOT NULL DEFAULT 2;

COMMENT ON COLUMN public.games.joker_multiplier IS 'Multiplier voor joker punten: 1 = normaal, 2 = verdubbeld';

-- ########## MIGRATIE: 20260512180047_30def525-cdea-4bc2-8c81-4589d38e9b74.sql ##########

CREATE OR REPLACE FUNCTION public.calculate_stage_scores(p_stage_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_game uuid;
  v_mult int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT game_id INTO v_game FROM public.stages WHERE id = p_stage_id;
  IF v_game IS NULL THEN RAISE EXCEPTION 'Stage not found'; END IF;

  SELECT COALESCE(joker_multiplier, 2) INTO v_mult FROM public.games WHERE id = v_game;
  IF v_mult IS NULL THEN v_mult := 2; END IF;

  DELETE FROM public.stage_points WHERE stage_id = p_stage_id;

  WITH rider_pts AS (
    SELECT
      sr.rider_id,
      COALESCE(ps.points, 0) AS pts
    FROM public.stage_results sr
    LEFT JOIN public.points_schema ps
      ON ps.game_id = v_game
     AND ps.classification = 'stage'
     AND ps.position = sr.finish_position
    WHERE sr.stage_id = p_stage_id
      AND sr.finish_position IS NOT NULL
      AND sr.finish_position BETWEEN 1 AND 20
      AND COALESCE(sr.did_finish, true) = true
  ),
  entry_rider_pts AS (
    SELECT
      ep.entry_id,
      ep.rider_id,
      COALESCE(rp.pts, 0) AS base_pts,
      CASE WHEN ej.rider_id IS NOT NULL THEN v_mult ELSE 1 END AS mult
    FROM public.entry_picks ep
    JOIN public.entries e
      ON e.id = ep.entry_id
     AND e.game_id = v_game
     AND e.status = 'submitted'
    LEFT JOIN rider_pts rp ON rp.rider_id = ep.rider_id
    LEFT JOIN public.entry_jokers ej
      ON ej.entry_id = ep.entry_id
     AND ej.rider_id = ep.rider_id

    UNION ALL

    SELECT
      ej.entry_id,
      ej.rider_id,
      COALESCE(rp.pts, 0) AS base_pts,
      v_mult AS mult
    FROM public.entry_jokers ej
    JOIN public.entries e
      ON e.id = ej.entry_id
     AND e.game_id = v_game
     AND e.status = 'submitted'
    LEFT JOIN rider_pts rp ON rp.rider_id = ej.rider_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.entry_picks ep2
      WHERE ep2.entry_id = ej.entry_id
        AND ep2.rider_id = ej.rider_id
    )
  )
  INSERT INTO public.stage_points(stage_id, entry_id, points)
  SELECT p_stage_id, entry_id, SUM(base_pts * mult)::int
  FROM entry_rider_pts
  GROUP BY entry_id;
END $function$;

-- ########## MIGRATIE: 20260512180536_4423aff1-593c-478a-93f2-6e8ccd15fc93.sql ##########

CREATE OR REPLACE FUNCTION public.admin_stage_points_breakdown(p_stage_id uuid)
 RETURNS TABLE(entry_id uuid, team_name text, display_name text, total_stage_points integer, breakdown jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH game AS (
    SELECT game_id FROM public.stages WHERE id = p_stage_id
  ),
  game_mult AS (
    SELECT COALESCE(g.joker_multiplier, 2) AS mult
    FROM public.games g WHERE g.id = (SELECT game_id FROM game)
  ),
  rider_pts AS (
    SELECT
      sr.rider_id,
      sr.finish_position,
      COALESCE(sr.did_finish, true) AS did_finish,
      COALESCE(ps.points, 0) AS pts
    FROM public.stage_results sr
    LEFT JOIN public.points_schema ps
      ON ps.game_id = (SELECT game_id FROM game)
     AND ps.classification = 'stage'
     AND ps.position = sr.finish_position
    WHERE sr.stage_id = p_stage_id
  ),
  entry_riders AS (
    SELECT ep.entry_id, ep.rider_id,
           CASE WHEN ej.rider_id IS NOT NULL THEN (SELECT mult FROM game_mult) ELSE 1 END AS mult,
           (ej.rider_id IS NOT NULL) AS is_joker
    FROM public.entry_picks ep
    JOIN public.entries e ON e.id = ep.entry_id
                         AND e.game_id = (SELECT game_id FROM game)
                         AND e.status = 'submitted'
    LEFT JOIN public.entry_jokers ej
      ON ej.entry_id = ep.entry_id AND ej.rider_id = ep.rider_id

    UNION ALL

    SELECT ej.entry_id, ej.rider_id, (SELECT mult FROM game_mult) AS mult, true AS is_joker
    FROM public.entry_jokers ej
    JOIN public.entries e ON e.id = ej.entry_id
                         AND e.game_id = (SELECT game_id FROM game)
                         AND e.status = 'submitted'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.entry_picks ep2
      WHERE ep2.entry_id = ej.entry_id AND ep2.rider_id = ej.rider_id
    )
  ),
  rows AS (
    SELECT
      er.entry_id,
      er.rider_id,
      r.name AS rider_name,
      rp.finish_position,
      COALESCE(rp.pts, 0) AS base_pts,
      er.is_joker,
      er.mult,
      CASE
        WHEN rp.finish_position IS NOT NULL
         AND rp.finish_position BETWEEN 1 AND 20
         AND rp.did_finish
        THEN COALESCE(rp.pts, 0) * er.mult
        ELSE 0
      END AS total
    FROM entry_riders er
    LEFT JOIN public.riders r ON r.id = er.rider_id
    LEFT JOIN rider_pts rp ON rp.rider_id = er.rider_id
  )
  SELECT
    e.id AS entry_id,
    e.team_name,
    COALESCE(p.display_name, 'Onbekend') AS display_name,
    COALESCE(SUM(rows.total)::int, 0) AS total_stage_points,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'rider_id', rows.rider_id,
          'rider_name', rows.rider_name,
          'finish_position', rows.finish_position,
          'base_pts', rows.base_pts,
          'is_joker', rows.is_joker,
          'multiplier', rows.mult,
          'total', rows.total
        )
        ORDER BY rows.total DESC NULLS LAST, rows.rider_name
      ) FILTER (WHERE rows.rider_id IS NOT NULL),
      '[]'::jsonb
    ) AS breakdown
  FROM public.entries e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  LEFT JOIN rows ON rows.entry_id = e.id
  WHERE public.is_admin()
    AND e.game_id = (SELECT game_id FROM game)
    AND e.status = 'submitted'
  GROUP BY e.id, e.team_name, p.display_name
  ORDER BY total_stage_points DESC, COALESCE(p.display_name, '');
$function$;

-- ########## MIGRATIE: 20260514000000_rider_firstcycling.sql ##########

-- Add FirstCycling rider ID to the riders table for fast result lookups
ALTER TABLE riders ADD COLUMN IF NOT EXISTS firstcycling_id integer;

-- Cache table: stores fetched 2026 season results per rider (TTL handled in edge function)
CREATE TABLE IF NOT EXISTS rider_results_cache (
  firstcycling_id  integer      NOT NULL,
  season           integer      NOT NULL DEFAULT 2026,
  rider_name       text         NOT NULL DEFAULT '',
  rider_team       text         NOT NULL DEFAULT '',
  rider_nationality text        NOT NULL DEFAULT '',
  results          jsonb        NOT NULL DEFAULT '[]'::jsonb,
  cached_at        timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (firstcycling_id, season)
);

-- Allow anyone to read the cache (public data); only the service role can write
ALTER TABLE rider_results_cache ENABLE ROW LEVEL SECURITY;

drop policy if exists "Public read rider results cache" on rider_results_cache;
CREATE POLICY "Public read rider results cache"
  ON rider_results_cache FOR SELECT USING (true);


-- ########## MIGRATIE: 20260514100941_a61b58ed-1121-406b-bb7a-1b254e0ee806.sql ##########

ALTER TABLE games ADD COLUMN IF NOT EXISTS accent_color text;

-- ########## MIGRATIE: 20260514123027_ce8df189-05f3-4ca3-8c52-98e5c4630751.sql ##########

-- Add FirstCycling rider ID to the riders table for fast result lookups
ALTER TABLE riders ADD COLUMN IF NOT EXISTS firstcycling_id integer;

-- Cache table: stores fetched 2026 season results per rider (TTL handled in edge function)
CREATE TABLE IF NOT EXISTS rider_results_cache (
  firstcycling_id  integer      NOT NULL,
  season           integer      NOT NULL DEFAULT 2026,
  rider_name       text         NOT NULL DEFAULT '',
  rider_team       text         NOT NULL DEFAULT '',
  rider_nationality text        NOT NULL DEFAULT '',
  results          jsonb        NOT NULL DEFAULT '[]'::jsonb,
  cached_at        timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (firstcycling_id, season)
);

-- Allow anyone to read the cache (public data); only the service role can write
ALTER TABLE rider_results_cache ENABLE ROW LEVEL SECURITY;

drop policy if exists "Public read rider results cache" on rider_results_cache;
CREATE POLICY "Public read rider results cache"
  ON rider_results_cache FOR SELECT USING (true);

-- ########## MIGRATIE: 20260514155839_b9e4e2b3-236a-4e01-be80-6b5e54b90282.sql ##########

-- Function to update updated_at column if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Rubriek items (text or poll)
CREATE TABLE public.rubriek_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('text', 'poll')),
    content TEXT, -- for 'text' type
    question TEXT, -- for 'poll' type
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Poll options
CREATE TABLE public.rubriek_options (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rubriek_id UUID REFERENCES public.rubriek_items(id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- User votes
CREATE TABLE public.rubriek_votes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rubriek_id UUID REFERENCES public.rubriek_items(id) ON DELETE CASCADE NOT NULL,
    option_id UUID REFERENCES public.rubriek_options(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(rubriek_id, user_id)
);

-- Indexes
CREATE INDEX idx_rubriek_items_game_active ON public.rubriek_items(game_id, is_active);
CREATE INDEX idx_rubriek_options_rubriek ON public.rubriek_options(rubriek_id);
CREATE INDEX idx_rubriek_votes_rubriek ON public.rubriek_votes(rubriek_id);
CREATE INDEX idx_rubriek_votes_user ON public.rubriek_votes(user_id);

-- RLS
ALTER TABLE public.rubriek_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubriek_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubriek_votes ENABLE ROW LEVEL SECURITY;

-- Policies: public view
drop policy if exists "Anyone can view rubriek items" on public.rubriek_items;
CREATE POLICY "Anyone can view rubriek items" ON public.rubriek_items FOR SELECT USING (true);
drop policy if exists "Anyone can view rubriek options" on public.rubriek_options;
CREATE POLICY "Anyone can view rubriek options" ON public.rubriek_options FOR SELECT USING (true);
drop policy if exists "Anyone can view rubriek votes" on public.rubriek_votes;
CREATE POLICY "Anyone can view rubriek votes" ON public.rubriek_votes FOR SELECT USING (true);

-- Admin helper: check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin policies
drop policy if exists "Admins can manage rubriek items" on public.rubriek_items;
CREATE POLICY "Admins can manage rubriek items" ON public.rubriek_items
    FOR ALL USING (public.is_admin());

drop policy if exists "Admins can manage rubriek options" on public.rubriek_options;
CREATE POLICY "Admins can manage rubriek options" ON public.rubriek_options
    FOR ALL USING (public.is_admin());

-- RPC for voting
CREATE OR REPLACE FUNCTION public.cast_rubriek_vote(p_rubriek_id UUID, p_option_id UUID)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_authenticated');
    END IF;

    IF EXISTS (SELECT 1 FROM public.rubriek_votes WHERE rubriek_id = p_rubriek_id AND user_id = v_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'already_voted');
    END IF;

    INSERT INTO public.rubriek_votes (rubriek_id, option_id, user_id)
    VALUES (p_rubriek_id, p_option_id, v_user_id);

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_rubriek_items_updated_at
    BEFORE UPDATE ON public.rubriek_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ########## MIGRATIE: 20260514160424_dc49ac11-83a6-4856-96f5-45e121f7b039.sql ##########

DROP TABLE IF EXISTS public.rubriek_votes  CASCADE;
DROP TABLE IF EXISTS public.rubriek_options CASCADE;
DROP TABLE IF EXISTS public.rubriek_items  CASCADE;

CREATE TABLE public.rubriek_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('text', 'poll')) DEFAULT 'text',
  content     text,
  question    text,
  options     jsonb,
  deadline    timestamptz,
  is_active   boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rubriek_votes (
  rubriek_id   uuid NOT NULL REFERENCES public.rubriek_items(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL,
  option_index int  NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rubriek_id, user_id)
);

ALTER TABLE public.rubriek_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubriek_votes ENABLE ROW LEVEL SECURITY;

drop policy if exists "rubriek_items_read" on public.rubriek_items;
CREATE POLICY "rubriek_items_read"  ON public.rubriek_items FOR SELECT USING (true);
drop policy if exists "rubriek_items_write" on public.rubriek_items;
CREATE POLICY "rubriek_items_write" ON public.rubriek_items FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

drop policy if exists "rubriek_votes_read" on public.rubriek_votes;
CREATE POLICY "rubriek_votes_read"   ON public.rubriek_votes FOR SELECT USING (true);
drop policy if exists "rubriek_votes_insert" on public.rubriek_votes;
CREATE POLICY "rubriek_votes_insert" ON public.rubriek_votes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
drop policy if exists "rubriek_votes_update" on public.rubriek_votes;
CREATE POLICY "rubriek_votes_update" ON public.rubriek_votes FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.cast_rubriek_vote(p_rubriek_id uuid, p_option_index int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deadline timestamptz;
  v_count    int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;

  SELECT deadline, jsonb_array_length(options)
    INTO v_deadline, v_count
    FROM public.rubriek_items
   WHERE id = p_rubriek_id AND type = 'poll';

  IF v_count IS NULL THEN RAISE EXCEPTION 'Poll niet gevonden'; END IF;
  IF v_deadline IS NOT NULL AND v_deadline <= now() THEN RAISE EXCEPTION 'Poll is gesloten'; END IF;
  IF p_option_index < 0 OR p_option_index >= v_count THEN RAISE EXCEPTION 'Ongeldige optie'; END IF;

  INSERT INTO public.rubriek_votes (rubriek_id, user_id, option_index)
  VALUES (p_rubriek_id, auth.uid(), p_option_index)
  ON CONFLICT (rubriek_id, user_id)
    DO UPDATE SET option_index = EXCLUDED.option_index, created_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_rubriek_vote(uuid, int) TO authenticated;

-- ########## MIGRATIE: 20260514200000_rubriek.sql ##########

-- ── Rubriek: game-scoped text posts + polls for "De Courant van Vandaag" ──────
-- Mirrors the chat_polls / chat_poll_votes pattern used by the Koerscafé.
-- options stored as jsonb string-array; votes use option_index (int).

DROP TABLE IF EXISTS public.rubriek_votes  CASCADE;
DROP TABLE IF EXISTS public.rubriek_options CASCADE;
DROP TABLE IF EXISTS public.rubriek_items  CASCADE;

CREATE TABLE public.rubriek_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('text', 'poll')) DEFAULT 'text',
  content     text,          -- type='text': the post body
  question    text,          -- type='poll': poll question
  options     jsonb,         -- type='poll': ["opt1","opt2",...] (2–6 items, same as chat_polls)
  deadline    timestamptz,   -- optional poll deadline
  is_active   boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rubriek_votes (
  rubriek_id   uuid NOT NULL REFERENCES public.rubriek_items(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL,
  option_index int  NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rubriek_id, user_id)  -- one row per user; ON CONFLICT allows vote changes
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.rubriek_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubriek_votes ENABLE ROW LEVEL SECURITY;

-- Public read; admin-only writes
drop policy if exists "rubriek_items_read" on public.rubriek_items;
CREATE POLICY "rubriek_items_read"  ON public.rubriek_items FOR SELECT USING (true);
drop policy if exists "rubriek_items_write" on public.rubriek_items;
CREATE POLICY "rubriek_items_write" ON public.rubriek_items FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Everyone can read vote counts; authenticated users can insert/update their own vote
drop policy if exists "rubriek_votes_read" on public.rubriek_votes;
CREATE POLICY "rubriek_votes_read"   ON public.rubriek_votes FOR SELECT USING (true);
drop policy if exists "rubriek_votes_insert" on public.rubriek_votes;
CREATE POLICY "rubriek_votes_insert" ON public.rubriek_votes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
drop policy if exists "rubriek_votes_update" on public.rubriek_votes;
CREATE POLICY "rubriek_votes_update" ON public.rubriek_votes FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── RPC: cast_rubriek_vote ────────────────────────────────────────────────────
-- Mirrors cast_chat_poll_vote: validates range + deadline, allows changing vote.

CREATE OR REPLACE FUNCTION public.cast_rubriek_vote(p_rubriek_id uuid, p_option_index int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deadline timestamptz;
  v_count    int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;

  SELECT deadline, jsonb_array_length(options)
    INTO v_deadline, v_count
    FROM public.rubriek_items
   WHERE id = p_rubriek_id AND type = 'poll';

  IF v_count IS NULL THEN RAISE EXCEPTION 'Poll niet gevonden'; END IF;
  IF v_deadline IS NOT NULL AND v_deadline <= now() THEN RAISE EXCEPTION 'Poll is gesloten'; END IF;
  IF p_option_index < 0 OR p_option_index >= v_count THEN RAISE EXCEPTION 'Ongeldige optie'; END IF;

  INSERT INTO public.rubriek_votes (rubriek_id, user_id, option_index)
  VALUES (p_rubriek_id, auth.uid(), p_option_index)
  ON CONFLICT (rubriek_id, user_id)
    DO UPDATE SET option_index = EXCLUDED.option_index, created_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_rubriek_vote(uuid, int) TO authenticated;


-- ########## MIGRATIE: 20260517000000_add_is_dnf_to_riders.sql ##########

-- Add is_dnf boolean to riders table for live-game DNF tracking
alter table riders
  add column if not exists is_dnf boolean not null default false;


-- ########## MIGRATIE: 20260517084350_931dce5f-42d2-41b9-b9cd-d9e5dc2d4a6f.sql ##########

-- Add is_dnf boolean to riders table for live-game DNF tracking
alter table riders
  add column if not exists is_dnf boolean not null default false;

-- ########## MIGRATIE: 20260518000000_public_unsubscribe.sql ##########

-- Publieke uitschrijffunctie: geen auth vereist, veilig via token.
-- Wordt aangeroepen vanuit de /uitschrijven pagina.

CREATE OR REPLACE FUNCTION public.public_unsubscribe(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email
  FROM public.email_unsubscribe_tokens
  WHERE token = p_token;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ongeldige of verlopen link');
  END IF;

  -- Markeer token als gebruikt
  UPDATE public.email_unsubscribe_tokens
  SET used_at = now()
  WHERE token = p_token;

  -- Voeg toe aan suppressed_emails (bij conflict: al uitgeschreven, prima)
  INSERT INTO public.suppressed_emails (email, reason)
  VALUES (v_email, 'unsubscribe')
  ON CONFLICT (email) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'email', v_email);
END;
$$;

-- Sta anonieme en ingelogde gebruikers toe deze functie te gebruiken
GRANT EXECUTE ON FUNCTION public.public_unsubscribe(text) TO anon, authenticated;


-- ########## MIGRATIE: 20260518155448_a1f541ad-6728-4260-ba24-f0b98ac2efc6.sql ##########

CREATE OR REPLACE FUNCTION public.public_unsubscribe(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email
  FROM public.email_unsubscribe_tokens
  WHERE token = p_token;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ongeldige of verlopen link');
  END IF;

  UPDATE public.email_unsubscribe_tokens
  SET used_at = now()
  WHERE token = p_token;

  INSERT INTO public.suppressed_emails (email, reason)
  VALUES (v_email, 'unsubscribe')
  ON CONFLICT (email) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'email', v_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_unsubscribe(text) TO anon, authenticated;

-- ########## MIGRATIE: 20260519153443_fd15ce84-cc3b-4518-b407-484d08e7c93a.sql ##########


-- Correct Bahrain-Victorious bib numbers to match official PCS startlist
-- Use negative temp values to avoid unique constraint conflicts
UPDATE riders SET start_number = -14 WHERE name = 'Fran Miholjevic';
UPDATE riders SET start_number = -13 WHERE name = 'Robert Stannard';
UPDATE riders SET start_number = -15 WHERE name = 'Afonso Eulalio';
UPDATE riders SET start_number = -16 WHERE name = 'Mathijs Paasschens';
UPDATE riders SET start_number = -17 WHERE name = 'Alec Segaert';

UPDATE riders SET start_number = 13 WHERE name = 'Fran Miholjevic';
UPDATE riders SET start_number = 17 WHERE name = 'Robert Stannard';
UPDATE riders SET start_number = 14 WHERE name = 'Afonso Eulalio';
UPDATE riders SET start_number = 15 WHERE name = 'Mathijs Paasschens';
UPDATE riders SET start_number = 16 WHERE name = 'Alec Segaert';


-- ########## MIGRATIE: 20260521000000_etappe_commentaren.sql ##########

-- ============================================
-- Etappe-commentaren: Michel Wuyts & José De Cauwer
-- AI-gegenereerd commentaar per subpoule per gefiatteerde etappe.
-- Wordt gevuld door de Edge Function `generate-stage-commentary`.
-- ============================================

CREATE TABLE IF NOT EXISTS public.etappe_commentaren (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id      uuid NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  subpoule_id   uuid NOT NULL REFERENCES public.subpoules(id) ON DELETE CASCADE,
  michel_tekst  text NOT NULL,
  jose_tekst    text NOT NULL,
  model         text,
  generated_at  timestamptz NOT NULL DEFAULT now(),
  generated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (stage_id, subpoule_id)
);

CREATE INDEX IF NOT EXISTS etappe_commentaren_subpoule_idx
  ON public.etappe_commentaren (subpoule_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS etappe_commentaren_stage_idx
  ON public.etappe_commentaren (stage_id);

ALTER TABLE public.etappe_commentaren ENABLE ROW LEVEL SECURITY;

-- SELECT: leden van de subpoule, eigenaar van de subpoule, of admin
DROP POLICY IF EXISTS etappe_commentaren_select ON public.etappe_commentaren;
drop policy if exists etappe_commentaren_select on public.etappe_commentaren;
CREATE POLICY etappe_commentaren_select ON public.etappe_commentaren
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.subpoules s
      WHERE s.id = etappe_commentaren.subpoule_id
        AND s.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.subpoule_members m
      WHERE m.subpoule_id = etappe_commentaren.subpoule_id
        AND m.user_id = auth.uid()
    )
  )
);

-- INSERT/UPDATE/DELETE: alleen admin via UI. De Edge Function gebruikt service_role
-- en omzeilt RLS sowieso.
DROP POLICY IF EXISTS etappe_commentaren_admin_write ON public.etappe_commentaren;
drop policy if exists etappe_commentaren_admin_write on public.etappe_commentaren;
CREATE POLICY etappe_commentaren_admin_write ON public.etappe_commentaren
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================
-- Realtime: voeg toe aan supabase_realtime publication
-- (zodat nieuw commentaar live in de subpoulechat verschijnt)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'etappe_commentaren'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.etappe_commentaren;
  END IF;
END $$;


-- ########## MIGRATIE: 20260521120000_karavaan_last_visited.sql ##########

-- ============================================
-- De Karavaan: tijdstempel voor "nieuw sinds je laatste bezoek"
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_visited_karavaan timestamptz;

-- RPC om eigen tijdstempel te updaten (security definer omdat profiles RLS strikt is)
CREATE OR REPLACE FUNCTION public.touch_karavaan_visit()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET last_visited_karavaan = now()
  WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.touch_karavaan_visit() FROM public;
GRANT EXECUTE ON FUNCTION public.touch_karavaan_visit() TO authenticated;


-- ########## MIGRATIE: 20260521163008_075f7aeb-aa8a-47cb-a5ed-a6e206ffb35b.sql ##########

CREATE TABLE IF NOT EXISTS public.etappe_commentaren (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id      uuid NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  subpoule_id   uuid NOT NULL REFERENCES public.subpoules(id) ON DELETE CASCADE,
  michel_tekst  text NOT NULL,
  jose_tekst    text NOT NULL,
  model         text,
  generated_at  timestamptz NOT NULL DEFAULT now(),
  generated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (stage_id, subpoule_id)
);

CREATE INDEX IF NOT EXISTS etappe_commentaren_subpoule_idx
  ON public.etappe_commentaren (subpoule_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS etappe_commentaren_stage_idx
  ON public.etappe_commentaren (stage_id);

ALTER TABLE public.etappe_commentaren ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS etappe_commentaren_select ON public.etappe_commentaren;
drop policy if exists etappe_commentaren_select on public.etappe_commentaren;
CREATE POLICY etappe_commentaren_select ON public.etappe_commentaren
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.subpoules s
      WHERE s.id = etappe_commentaren.subpoule_id
        AND s.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.subpoule_members m
      WHERE m.subpoule_id = etappe_commentaren.subpoule_id
        AND m.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS etappe_commentaren_admin_write ON public.etappe_commentaren;
drop policy if exists etappe_commentaren_admin_write on public.etappe_commentaren;
CREATE POLICY etappe_commentaren_admin_write ON public.etappe_commentaren
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'etappe_commentaren'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.etappe_commentaren;
  END IF;
END $$;

-- ########## MIGRATIE: 20260521182619_10c27d87-af0f-448e-9c23-f6668844c8d0.sql ##########

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_visited_karavaan timestamptz;

CREATE OR REPLACE FUNCTION public.touch_karavaan_visit()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET last_visited_karavaan = now()
  WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.touch_karavaan_visit() FROM public;
GRANT EXECUTE ON FUNCTION public.touch_karavaan_visit() TO authenticated;

-- ########## MIGRATIE: 20260522120000_lefevere_rapporten.sql ##########

-- ============================================
-- Lefevere-rapporten: cache per (deelnemer, aantal gefiatteerde etappes).
-- Bespaart Anthropic-calls: het rapport wordt alleen opnieuw gegenereerd
-- zodra er een etappe bijkomt (stage_count verandert). Insert-only; oudere
-- stage_count-rijen blijven als historie staan.
-- ============================================

CREATE TABLE IF NOT EXISTS public.lefevere_rapporten (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id              uuid NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  stage_count           integer NOT NULL,
  directeurs_analyse    text NOT NULL,
  ploeg_karakterisering text NOT NULL,
  score                 numeric,
  model                 text,
  generated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, stage_count)
);

CREATE INDEX IF NOT EXISTS lefevere_rapporten_entry_idx
  ON public.lefevere_rapporten (entry_id, stage_count DESC);

ALTER TABLE public.lefevere_rapporten ENABLE ROW LEVEL SECURITY;

-- SELECT: eigen rapport (entry hoort bij de user) of admin
DROP POLICY IF EXISTS lefevere_rapporten_select ON public.lefevere_rapporten;
drop policy if exists lefevere_rapporten_select on public.lefevere_rapporten;
CREATE POLICY lefevere_rapporten_select ON public.lefevere_rapporten
FOR SELECT USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()
  )
);

-- INSERT: alleen voor je eigen entry
DROP POLICY IF EXISTS lefevere_rapporten_insert ON public.lefevere_rapporten;
drop policy if exists lefevere_rapporten_insert on public.lefevere_rapporten;
CREATE POLICY lefevere_rapporten_insert ON public.lefevere_rapporten
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()
  )
);


-- ########## MIGRATIE: 20260522130000_lefevere_rapporten_update_policy.sql ##########

-- ============================================
-- UPDATE-policy voor lefevere_rapporten: eigen rij mogen overschrijven.
-- Nodig voor het zelf-herstel in useLefevereReport — een rij die ooit met een
-- fout cijfer is gecacht (bv. tijdens het laden) wordt opnieuw gegenereerd en
-- via upsert overschreven. Aparte migratie omdat de tabel-migratie mogelijk al
-- gedraaid is.
-- ============================================

DROP POLICY IF EXISTS lefevere_rapporten_update ON public.lefevere_rapporten;
drop policy if exists lefevere_rapporten_update on public.lefevere_rapporten;
CREATE POLICY lefevere_rapporten_update ON public.lefevere_rapporten
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()
  )
);


-- ########## MIGRATIE: 20260522160947_3328afb4-4662-4811-a36c-94ee5b6e2e9d.sql ##########

CREATE TABLE IF NOT EXISTS public.lefevere_rapporten (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id              uuid NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  stage_count           integer NOT NULL,
  directeurs_analyse    text NOT NULL,
  ploeg_karakterisering text NOT NULL,
  score                 numeric,
  model                 text,
  generated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, stage_count)
);

CREATE INDEX IF NOT EXISTS lefevere_rapporten_entry_idx
  ON public.lefevere_rapporten (entry_id, stage_count DESC);

ALTER TABLE public.lefevere_rapporten ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lefevere_rapporten_select ON public.lefevere_rapporten;
drop policy if exists lefevere_rapporten_select on public.lefevere_rapporten;
CREATE POLICY lefevere_rapporten_select ON public.lefevere_rapporten
FOR SELECT USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS lefevere_rapporten_insert ON public.lefevere_rapporten;
drop policy if exists lefevere_rapporten_insert on public.lefevere_rapporten;
CREATE POLICY lefevere_rapporten_insert ON public.lefevere_rapporten
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()
  )
);

-- ########## MIGRATIE: 20260522161802_b66081b6-d07d-4c2a-80f6-f25c95bf9489.sql ##########

drop policy if exists "lefevere_rapporten_update" on public.lefevere_rapporten;
CREATE POLICY "lefevere_rapporten_update" ON public.lefevere_rapporten
FOR UPDATE
USING (EXISTS (SELECT 1 FROM entries e WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM entries e WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()));

-- ########## MIGRATIE: 20260524083310_7bf1c2c3-15dc-4b3b-a65a-2ad0a1d072af.sql ##########


-- 1. rubriek_votes: require authentication to read
DROP POLICY IF EXISTS rubriek_votes_read ON public.rubriek_votes;
drop policy if exists rubriek_votes_read on public.rubriek_votes;
CREATE POLICY rubriek_votes_read ON public.rubriek_votes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. profiles: prevent privilege escalation in policy (defence in depth — trigger also enforces)
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
drop policy if exists profiles_update_self on public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid())
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 3. realtime.messages: require authenticated session to subscribe to any topic
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'realtime' AND tablename = 'messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages';
    EXECUTE $p$CREATE POLICY "Authenticated users can receive broadcasts" ON realtime.messages
      FOR SELECT TO authenticated USING (true)$p$;
  END IF;
END $$;

-- 4. Fix mutable search_path on email queue helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;


-- ########## MIGRATIE: 20260524120000_games_theme.sql ##########

-- ============================================
-- Thema per game: roze (Giro) / geel (Tour) / rood (Vuelta).
-- Nullable; bij leeg valt de frontend terug op game_type.
-- ============================================

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS theme text
  CHECK (theme IS NULL OR theme IN ('roze', 'geel', 'rood'));

-- Backfill op basis van bestaand game_type (best effort)
UPDATE public.games SET theme = 'roze'  WHERE theme IS NULL AND game_type = 'giro';
UPDATE public.games SET theme = 'geel'  WHERE theme IS NULL AND game_type IN ('tdf', 'tour');
UPDATE public.games SET theme = 'rood'  WHERE theme IS NULL AND game_type = 'vuelta';


-- ########## MIGRATIE: 20260524140000_lefevere_admin_delete.sql ##########

-- ============================================
-- DELETE-policy voor lefevere_rapporten: admin mag cache wissen.
-- Nodig voor de admin-knop "Regenereer Lefevère" in Fiatteren: door de
-- gecachte rapporten te verwijderen, genereert elke deelnemer bij de volgende
-- weergave een vers rapport (nu via het nieuwe model / verbeterde prompt).
-- ============================================

DROP POLICY IF EXISTS lefevere_rapporten_delete_admin ON public.lefevere_rapporten;
drop policy if exists lefevere_rapporten_delete_admin on public.lefevere_rapporten;
CREATE POLICY lefevere_rapporten_delete_admin ON public.lefevere_rapporten
FOR DELETE USING (public.is_admin());


-- ########## MIGRATIE: 20260524175151_1b99e9ee-b913-4d76-a143-5be184a6e54d.sql ##########

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS theme text
  CHECK (theme IS NULL OR theme IN ('roze', 'geel', 'rood'));

UPDATE public.games SET theme = 'roze'  WHERE theme IS NULL AND game_type = 'giro';
UPDATE public.games SET theme = 'geel'  WHERE theme IS NULL AND game_type IN ('tdf', 'tour');
UPDATE public.games SET theme = 'rood'  WHERE theme IS NULL AND game_type = 'vuelta';

-- ########## MIGRATIE: 20260524190908_5051d312-6ee0-4cbf-96da-25e4fc46f0e7.sql ##########

DROP POLICY IF EXISTS lefevere_rapporten_delete_admin ON public.lefevere_rapporten;
drop policy if exists lefevere_rapporten_delete_admin on public.lefevere_rapporten;
CREATE POLICY lefevere_rapporten_delete_admin ON public.lefevere_rapporten
FOR DELETE USING (public.is_admin());

-- ########## MIGRATIE: 20260525120000_stages_profile_image.sql ##########

-- ============================================
-- Etappe-profiel: URL naar een profielafbeelding (bv. van touretappe.nl of
-- een eigen upload). Getoond in "De Voorbeschouwing" in de Gazetta.
-- ============================================

ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS profile_image_url text;


-- ########## MIGRATIE: 20260525130000_stages_profile_data.sql ##########

-- ============================================
-- Geëxtraheerde profieldata per etappe (kernpunten: km, hoogte, labels, klim-%).
-- Gevuld door de edge function generate-stage-profile (vision-model leest het
-- touretappe-profiel), waarna de frontend er een strakke SVG van tekent.
-- ============================================

ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS profile_data jsonb;


-- ########## MIGRATIE: 20260525140000_stage_profiles_bucket.sql ##########

-- ============================================
-- Storage-bucket voor geüploade etappeprofielen (admin upload in StagesTab).
-- Publiek leesbaar; alleen admins mogen schrijven/wissen.
-- ============================================

insert into storage.buckets (id, name, public)
values ('stage-profiles', 'stage-profiles', true)
on conflict (id) do nothing;

drop policy if exists "stage_profiles_read" on storage.objects;
drop policy if exists "stage_profiles_read" on storage.objects;
create policy "stage_profiles_read" on storage.objects
  for select using (bucket_id = 'stage-profiles');

drop policy if exists "stage_profiles_admin_insert" on storage.objects;
drop policy if exists "stage_profiles_admin_insert" on storage.objects;
create policy "stage_profiles_admin_insert" on storage.objects
  for insert with check (bucket_id = 'stage-profiles' and public.is_admin());

drop policy if exists "stage_profiles_admin_update" on storage.objects;
drop policy if exists "stage_profiles_admin_update" on storage.objects;
create policy "stage_profiles_admin_update" on storage.objects
  for update using (bucket_id = 'stage-profiles' and public.is_admin())
  with check (bucket_id = 'stage-profiles' and public.is_admin());

drop policy if exists "stage_profiles_admin_delete" on storage.objects;
drop policy if exists "stage_profiles_admin_delete" on storage.objects;
create policy "stage_profiles_admin_delete" on storage.objects
  for delete using (bucket_id = 'stage-profiles' and public.is_admin());


-- ########## MIGRATIE: 20260525170441_ed7bbcba-20d0-4007-ae00-65c7f6fac605.sql ##########

ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS profile_image_url text;

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS theme text
  CHECK (theme IS NULL OR theme IN ('roze', 'geel', 'rood'));

UPDATE public.games SET theme = 'roze'  WHERE theme IS NULL AND game_type = 'giro';
UPDATE public.games SET theme = 'geel'  WHERE theme IS NULL AND game_type IN ('tdf', 'tour');
UPDATE public.games SET theme = 'rood'  WHERE theme IS NULL AND game_type = 'vuelta';

-- ########## MIGRATIE: 20260525172441_5d573c58-1b9e-476c-a046-b629d0a7703f.sql ##########

-- 20260525120000_stages_profile_image (idempotent)
ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS profile_image_url text;

-- 20260524120000_games_theme (idempotent)
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS theme text;

DO $$ BEGIN
  ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_theme_check;
  ALTER TABLE public.games ADD CONSTRAINT games_theme_check
    CHECK (theme IS NULL OR theme IN ('roze','geel','rood'));
END $$;

UPDATE public.games SET theme = CASE
  WHEN game_type = 'giro' THEN 'roze'
  WHEN game_type IN ('tdf','tour') THEN 'geel'
  WHEN game_type = 'vuelta' THEN 'rood'
  ELSE theme
END
WHERE theme IS NULL;

-- ########## MIGRATIE: 20260525175015_98eb1539-7613-4c93-88fa-ee7d2e0342fc.sql ##########

ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS profile_data jsonb;

-- ########## MIGRATIE: 20260525182733_1f636241-1e86-4bd2-b644-96be061bec78.sql ##########

ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS profile_data jsonb;

-- ########## MIGRATIE: 20260525183543_57627d12-128b-414e-bdf8-dbb7d833c9a0.sql ##########

ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS profile_data jsonb;

-- ########## MIGRATIE: 20260525184638_69dead15-0648-4b07-8d2f-401a0e9c2e60.sql ##########


INSERT INTO storage.buckets (id, name, public)
VALUES ('stage-profiles', 'stage-profiles', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Stage profiles are publicly accessible" ON storage.objects;
drop policy if exists "Stage profiles are publicly accessible" on storage.objects;
CREATE POLICY "Stage profiles are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'stage-profiles');

DROP POLICY IF EXISTS "Admins can upload stage profiles" ON storage.objects;
drop policy if exists "Admins can upload stage profiles" on storage.objects;
CREATE POLICY "Admins can upload stage profiles"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'stage-profiles' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update stage profiles" ON storage.objects;
drop policy if exists "Admins can update stage profiles" on storage.objects;
CREATE POLICY "Admins can update stage profiles"
ON storage.objects FOR UPDATE
USING (bucket_id = 'stage-profiles' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete stage profiles" ON storage.objects;
drop policy if exists "Admins can delete stage profiles" on storage.objects;
CREATE POLICY "Admins can delete stage profiles"
ON storage.objects FOR DELETE
USING (bucket_id = 'stage-profiles' AND public.is_admin());


-- ########## MIGRATIE: 20260529160546_13dad597-383e-4e66-b5b3-469ec7543407.sql ##########


-- profiles cleanup
DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_profile_privilege_escalation();

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;

CREATE OR REPLACE FUNCTION public.assign_admin_role(p_user_id uuid, p_make_admin boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_make_admin then
    insert into public.user_roles(user_id, role) values (p_user_id, 'admin') on conflict do nothing;
  else
    delete from public.user_roles where user_id = p_user_id and role = 'admin';
  end if;
end $$;

CREATE OR REPLACE FUNCTION public.admin_user_overview()
RETURNS TABLE(user_id uuid, email text, created_at timestamp with time zone, is_admin boolean, teams_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT u.id, u.email::text, u.created_at,
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin'),
    (SELECT count(*) FROM public.entries e WHERE e.user_id = u.id)
  FROM auth.users u
  WHERE public.is_admin();
$$;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;

drop policy if exists profiles_update_self on public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Realtime: restrict broadcast/presence reads
drop policy if exists "deny_broadcast_presence_reads" on realtime.messages;
CREATE POLICY "deny_broadcast_presence_reads" ON realtime.messages
  FOR SELECT TO authenticated USING (false);

-- Storage: remove listing for stage-profiles bucket; public URL still works
DROP POLICY IF EXISTS "Stage profiles are publicly accessible" ON storage.objects;


-- ########## MIGRATIE: 20260531075320_b4dfee50-59c3-4e85-9553-c76fd5dbed20.sql ##########

DROP FUNCTION IF EXISTS public.game_entries_detail(uuid);

CREATE OR REPLACE FUNCTION public.game_entries_detail(p_game_id uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  entry_id uuid,
  team_name text,
  total_points integer,
  picks jsonb,
  jokers jsonb,
  predictions jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.user_id,
    COALESCE(p.display_name, 'Onbekend') AS display_name,
    e.id AS entry_id,
    e.team_name,
    COALESCE(e.total_points, 0) AS total_points,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('category_id', ep.category_id, 'rider_id', ep.rider_id) ORDER BY ep.category_id::text, ep.created_at)
       FROM public.entry_picks ep WHERE ep.entry_id = e.id),
      '[]'::jsonb
    ) AS picks,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('rider_id', ej.rider_id) ORDER BY ej.created_at)
       FROM public.entry_jokers ej WHERE ej.entry_id = e.id),
      '[]'::jsonb
    ) AS jokers,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('classification', epr.classification, 'position', epr.position, 'rider_id', epr.rider_id) ORDER BY epr.classification, epr.position)
       FROM public.entry_predictions epr WHERE epr.entry_id = e.id),
      '[]'::jsonb
    ) AS predictions
  FROM public.entries e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE e.game_id = p_game_id
    AND e.status = 'submitted'
  ORDER BY COALESCE(e.total_points, 0) DESC, COALESCE(p.display_name, '') ASC;
$$;

REVOKE ALL ON FUNCTION public.game_entries_detail(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.game_entries_detail(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.game_entries_detail(uuid) TO authenticated;

-- ########## MIGRATIE: 20260531120000_game_entries_detail.sql ##########

-- game_entries_detail: zoals subpoule_entries_detail, maar voor ALLE ingediende
-- teams in een game. Nodig voor de game-brede benchmark (Hors Categorie ->
-- Benchmark), waar je je team + jokers + voorspellingen met elke andere
-- deelnemer kunt vergelijken. SECURITY DEFINER omdat entries/picks/jokers/
-- predictions per RLS alleen door de eigenaar leesbaar zijn; deze read is pas
-- zinvol nadat de inschrijving gesloten is (benchmark is in de UI gated).

DROP FUNCTION IF EXISTS public.game_entries_detail(uuid);

CREATE OR REPLACE FUNCTION public.game_entries_detail(p_game_id uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  entry_id uuid,
  team_name text,
  total_points integer,
  picks jsonb,
  jokers jsonb,
  predictions jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.user_id,
    COALESCE(p.display_name, 'Onbekend') AS display_name,
    e.id AS entry_id,
    e.team_name,
    COALESCE(e.total_points, 0) AS total_points,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('category_id', ep.category_id, 'rider_id', ep.rider_id) ORDER BY ep.category_id::text, ep.created_at)
       FROM public.entry_picks ep WHERE ep.entry_id = e.id),
      '[]'::jsonb
    ) AS picks,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('rider_id', ej.rider_id) ORDER BY ej.created_at)
       FROM public.entry_jokers ej WHERE ej.entry_id = e.id),
      '[]'::jsonb
    ) AS jokers,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('classification', epr.classification, 'position', epr.position, 'rider_id', epr.rider_id) ORDER BY epr.classification, epr.position)
       FROM public.entry_predictions epr WHERE epr.entry_id = e.id),
      '[]'::jsonb
    ) AS predictions
  FROM public.entries e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE e.game_id = p_game_id
    AND e.status = 'submitted'
  ORDER BY COALESCE(e.total_points, 0) DESC, COALESCE(p.display_name, '') ASC;
$$;

REVOKE ALL ON FUNCTION public.game_entries_detail(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.game_entries_detail(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.game_entries_detail(uuid) TO authenticated;


-- ########## MIGRATIE: 20260531140000_editable_prediction_scoring.sql ##########

-- Maakt de GC-/trui-voorspellingsscores AANPASBAAR per game.
-- De puntwaarden komen uit points_schema (nieuwe classificaties), met de
-- bestaande vaste waarden als fallback:
--   pred_gc_exact   (pos 1) → juiste renner op juiste plek in GC-podium  (default 50)
--   pred_gc_podium  (pos 1) → juiste renner in top 3, verkeerde plek     (default 25)
--   pred_jersey     (pos 1) → juiste winnaar groen/berg/wit (per trui)   (default 25)
--
-- De winnaars worden net als voorheen afgeleid uit de stage_results van de
-- laatste (hoogst genummerde) etappe met goedgekeurde uitslag (de Giro: rit 21,
-- gc_position/points_position/mountain_position/youth_position = 1..3).

-- points_schema.classification mag nu ook de voorspellings-puntwaarden bevatten.
ALTER TABLE public.points_schema DROP CONSTRAINT IF EXISTS points_schema_classification_check;
ALTER TABLE public.points_schema
  ADD CONSTRAINT points_schema_classification_check
  CHECK (classification IN ('stage','gc','kom','points','youth','pred_gc_exact','pred_gc_podium','pred_jersey'));

CREATE OR REPLACE FUNCTION public.calculate_prediction_points(p_game_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last_stage uuid;
  v_final_stage_number integer;
  v_gc_winner uuid;
  v_gc_2 uuid;
  v_gc_3 uuid;
  v_points_winner uuid;
  v_kom_winner uuid;
  v_youth_winner uuid;
  -- Aanpasbare puntwaarden (uit points_schema, met defaults)
  v_pts_gc_exact  integer;
  v_pts_gc_podium integer;
  v_pts_jersey    integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- Lees de (aanpasbare) puntwaarden; val terug op de standaardwaarden.
  SELECT COALESCE((SELECT points FROM public.points_schema
                   WHERE game_id = p_game_id AND classification = 'pred_gc_exact'  AND position = 1), 50) INTO v_pts_gc_exact;
  SELECT COALESCE((SELECT points FROM public.points_schema
                   WHERE game_id = p_game_id AND classification = 'pred_gc_podium' AND position = 1), 25) INTO v_pts_gc_podium;
  SELECT COALESCE((SELECT points FROM public.points_schema
                   WHERE game_id = p_game_id AND classification = 'pred_jersey'    AND position = 1), 25) INTO v_pts_jersey;

  -- Wis bestaande voorspellingspunten voor deze game
  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  -- Hoogste etappenummer
  SELECT max(stage_number) INTO v_final_stage_number
  FROM public.stages
  WHERE game_id = p_game_id;

  -- Laatste etappe met goedgekeurde uitslag + bestaande stage_results
  SELECT id INTO v_last_stage
  FROM public.stages
  WHERE game_id = p_game_id
    AND stage_number = v_final_stage_number
    AND results_status = 'approved'
    AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = stages.id)
  LIMIT 1;

  -- Niet gevonden? Probeer de hoogst genummerde etappe die wél een goedgekeurde
  -- uitslag heeft (bv. als de allerlaatste etappe een GC-displayrit zonder
  -- uitslag is).
  IF v_last_stage IS NULL THEN
    SELECT s.id INTO v_last_stage
    FROM public.stages s
    WHERE s.game_id = p_game_id
      AND s.results_status = 'approved'
      AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = s.id)
    ORDER BY s.stage_number DESC
    LIMIT 1;
  END IF;

  IF v_last_stage IS NULL THEN
    RETURN;  -- Nog geen goedgekeurde uitslag, niets te scoren
  END IF;

  -- Werkelijke winnaars uit de stage_results van de laatste etappe
  SELECT rider_id INTO v_gc_winner    FROM public.stage_results WHERE stage_id = v_last_stage AND gc_position = 1 LIMIT 1;
  SELECT rider_id INTO v_gc_2         FROM public.stage_results WHERE stage_id = v_last_stage AND gc_position = 2 LIMIT 1;
  SELECT rider_id INTO v_gc_3         FROM public.stage_results WHERE stage_id = v_last_stage AND gc_position = 3 LIMIT 1;
  SELECT rider_id INTO v_points_winner FROM public.stage_results WHERE stage_id = v_last_stage AND points_position = 1 LIMIT 1;
  SELECT rider_id INTO v_kom_winner   FROM public.stage_results WHERE stage_id = v_last_stage AND mountain_position = 1 LIMIT 1;
  SELECT rider_id INTO v_youth_winner FROM public.stage_results WHERE stage_id = v_last_stage AND youth_position = 1 LIMIT 1;

  -- ===== GC-PODIUM =====
  -- Juiste plek: v_pts_gc_exact · juiste renner verkeerde plek: v_pts_gc_podium · anders 0.
  -- Elke positie apart; een renner kan max één keer scoren (positie-gebaseerd).
  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT
    p.entry_id,
    'gc',
    p.position,
    CASE
      WHEN p.position = 1 AND p.rider_id = v_gc_winner THEN v_pts_gc_exact
      WHEN p.position = 2 AND p.rider_id = v_gc_2      THEN v_pts_gc_exact
      WHEN p.position = 3 AND p.rider_id = v_gc_3      THEN v_pts_gc_exact
      WHEN p.rider_id IN (v_gc_winner, v_gc_2, v_gc_3)
       AND p.rider_id IS NOT NULL
       AND NOT (
         (p.position = 1 AND p.rider_id = v_gc_winner) OR
         (p.position = 2 AND p.rider_id = v_gc_2)      OR
         (p.position = 3 AND p.rider_id = v_gc_3)
       )
      THEN v_pts_gc_podium
      ELSE 0
    END AS points
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  WHERE p.classification = 'gc' AND p.position BETWEEN 1 AND 3;

  -- ===== TRUIEN (groen/berg/wit) =====
  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT
    p.entry_id,
    p.classification,
    1,
    CASE
      WHEN p.classification = 'points' AND p.rider_id = v_points_winner THEN v_pts_jersey
      WHEN p.classification = 'kom'    AND p.rider_id = v_kom_winner    THEN v_pts_jersey
      WHEN p.classification = 'youth'  AND p.rider_id = v_youth_winner  THEN v_pts_jersey
      ELSE 0
    END
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  WHERE p.classification IN ('points','kom','youth')
    AND p.position = 1;
END $function$;


-- ########## MIGRATIE: 20260531160000_total_includes_predictions.sql ##########

-- Het totaalklassement moet de GC-/trui-voorspellingspunten MEETELLEN bij de
-- 21 etappepunten. update_total_ranking somde tot nu toe alleen stage_points,
-- waardoor de voorspellingspunten bij elke (her)berekening of fiattering weer
-- uit het totaal verdwenen. Nu: totaal = som(stage_points) + som(entry_prediction_points).

CREATE OR REPLACE FUNCTION public.update_total_ranking(p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  INSERT INTO public.total_points(entry_id, total_points, updated_at)
  SELECT
    e.id,
    (
      COALESCE((SELECT SUM(sp.points)
                  FROM public.stage_points sp
                  JOIN public.stages s ON s.id = sp.stage_id
                 WHERE sp.entry_id = e.id AND s.game_id = p_game_id), 0)
      +
      COALESCE((SELECT SUM(epp.points)
                  FROM public.entry_prediction_points epp
                 WHERE epp.entry_id = e.id), 0)
    )::int,
    now()
  FROM public.entries e
  WHERE e.game_id = p_game_id
  ON CONFLICT (entry_id) DO UPDATE
    SET total_points = EXCLUDED.total_points, updated_at = now();

  UPDATE public.entries e
  SET total_points = COALESCE(tp.total_points, 0)
  FROM public.total_points tp
  WHERE tp.entry_id = e.id AND e.game_id = p_game_id;
END $$;


-- ########## MIGRATIE: 20260531190112_589a66d5-b511-4214-807a-97e779f6c5d8.sql ##########

ALTER TABLE public.points_schema DROP CONSTRAINT IF EXISTS points_schema_classification_check;
ALTER TABLE public.points_schema
  ADD CONSTRAINT points_schema_classification_check
  CHECK (classification IN ('stage','gc','kom','points','youth','pred_gc_exact','pred_gc_podium','pred_jersey'));

CREATE OR REPLACE FUNCTION public.calculate_prediction_points(p_game_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last_stage uuid;
  v_final_stage_number integer;
  v_gc_winner uuid;
  v_gc_2 uuid;
  v_gc_3 uuid;
  v_points_winner uuid;
  v_kom_winner uuid;
  v_youth_winner uuid;
  v_pts_gc_exact  integer;
  v_pts_gc_podium integer;
  v_pts_jersey    integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT COALESCE((SELECT points FROM public.points_schema
                   WHERE game_id = p_game_id AND classification = 'pred_gc_exact'  AND position = 1), 50) INTO v_pts_gc_exact;
  SELECT COALESCE((SELECT points FROM public.points_schema
                   WHERE game_id = p_game_id AND classification = 'pred_gc_podium' AND position = 1), 25) INTO v_pts_gc_podium;
  SELECT COALESCE((SELECT points FROM public.points_schema
                   WHERE game_id = p_game_id AND classification = 'pred_jersey'    AND position = 1), 25) INTO v_pts_jersey;

  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  SELECT max(stage_number) INTO v_final_stage_number
  FROM public.stages
  WHERE game_id = p_game_id;

  SELECT id INTO v_last_stage
  FROM public.stages
  WHERE game_id = p_game_id
    AND stage_number = v_final_stage_number
    AND results_status = 'approved'
    AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = stages.id)
  LIMIT 1;

  IF v_last_stage IS NULL THEN
    SELECT s.id INTO v_last_stage
    FROM public.stages s
    WHERE s.game_id = p_game_id
      AND s.results_status = 'approved'
      AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = s.id)
    ORDER BY s.stage_number DESC
    LIMIT 1;
  END IF;

  IF v_last_stage IS NULL THEN
    RETURN;
  END IF;

  SELECT rider_id INTO v_gc_winner    FROM public.stage_results WHERE stage_id = v_last_stage AND gc_position = 1 LIMIT 1;
  SELECT rider_id INTO v_gc_2         FROM public.stage_results WHERE stage_id = v_last_stage AND gc_position = 2 LIMIT 1;
  SELECT rider_id INTO v_gc_3         FROM public.stage_results WHERE stage_id = v_last_stage AND gc_position = 3 LIMIT 1;
  SELECT rider_id INTO v_points_winner FROM public.stage_results WHERE stage_id = v_last_stage AND points_position = 1 LIMIT 1;
  SELECT rider_id INTO v_kom_winner   FROM public.stage_results WHERE stage_id = v_last_stage AND mountain_position = 1 LIMIT 1;
  SELECT rider_id INTO v_youth_winner FROM public.stage_results WHERE stage_id = v_last_stage AND youth_position = 1 LIMIT 1;

  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT
    p.entry_id,
    'gc',
    p.position,
    CASE
      WHEN p.position = 1 AND p.rider_id = v_gc_winner THEN v_pts_gc_exact
      WHEN p.position = 2 AND p.rider_id = v_gc_2      THEN v_pts_gc_exact
      WHEN p.position = 3 AND p.rider_id = v_gc_3      THEN v_pts_gc_exact
      WHEN p.rider_id IN (v_gc_winner, v_gc_2, v_gc_3)
       AND p.rider_id IS NOT NULL
       AND NOT (
         (p.position = 1 AND p.rider_id = v_gc_winner) OR
         (p.position = 2 AND p.rider_id = v_gc_2)      OR
         (p.position = 3 AND p.rider_id = v_gc_3)
       )
      THEN v_pts_gc_podium
      ELSE 0
    END AS points
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  WHERE p.classification = 'gc' AND p.position BETWEEN 1 AND 3;

  INSERT INTO public.entry_prediction_points (entry_id, classification, position, points)
  SELECT
    p.entry_id,
    p.classification,
    1,
    CASE
      WHEN p.classification = 'points' AND p.rider_id = v_points_winner THEN v_pts_jersey
      WHEN p.classification = 'kom'    AND p.rider_id = v_kom_winner    THEN v_pts_jersey
      WHEN p.classification = 'youth'  AND p.rider_id = v_youth_winner  THEN v_pts_jersey
      ELSE 0
    END
  FROM public.entry_predictions p
  JOIN public.entries e ON e.id = p.entry_id AND e.game_id = p_game_id
  WHERE p.classification IN ('points','kom','youth')
    AND p.position = 1;
END $function$;

-- ########## MIGRATIE: 20260531192547_750d735b-1a3d-4fd8-bd6c-e77ad3814921.sql ##########

CREATE OR REPLACE FUNCTION public.update_total_ranking(p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  INSERT INTO public.total_points(entry_id, total_points, updated_at)
  SELECT
    e.id,
    (
      COALESCE((SELECT SUM(sp.points)
                  FROM public.stage_points sp
                  JOIN public.stages s ON s.id = sp.stage_id
                 WHERE sp.entry_id = e.id AND s.game_id = p_game_id), 0)
      +
      COALESCE((SELECT SUM(epp.points)
                  FROM public.entry_prediction_points epp
                 WHERE epp.entry_id = e.id), 0)
    )::int,
    now()
  FROM public.entries e
  WHERE e.game_id = p_game_id
  ON CONFLICT (entry_id) DO UPDATE
    SET total_points = EXCLUDED.total_points, updated_at = now();

  UPDATE public.entries e
  SET total_points = COALESCE(tp.total_points, 0)
  FROM public.total_points tp
  WHERE tp.entry_id = e.id AND e.game_id = p_game_id;
END $$;

-- ########## MIGRATIE: 20260531200000_game_type_femmes.sql ##########

-- Sta 'femmes' (Tour de France Femmes) toe als game_type. Femmes hergebruikt het
-- gele Tour-thema (theme = 'geel'), dus de theme-CHECK hoeft niet te wijzigen.
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_game_type_check;
ALTER TABLE public.games ADD CONSTRAINT games_game_type_check
  CHECK (game_type = ANY (ARRAY['giro'::text, 'tour'::text, 'tdf'::text, 'vuelta'::text, 'femmes'::text, 'other'::text]));

-- Backfill: een femmes-game zonder expliciet thema krijgt het gele thema.
UPDATE public.games SET theme = 'geel' WHERE theme IS NULL AND game_type = 'femmes';


-- ########## MIGRATIE: 20260601140000_scaling_indexes.sql ##########

-- Schaal-indexes: versnellen de zwaarste reads/recalcs naarmate het aantal
-- deelnemers groeit. Allemaal IF NOT EXISTS → veilig en idempotent.
--
-- Bestond al: entries(game_id), entries(user_id), stage_results(stage_id),
-- stage_points UNIQUE(stage_id, entry_id), entry_predictions(entry_id),
-- entry_prediction_points(entry_id).
--
-- Ontbrak (entry-scoped lookups + de 'submitted'-filter):

-- Per-entry punten (useMyStagePointTotal / recalc joins). De bestaande
-- composite (stage_id, entry_id) bedient entry_id-alleen niet efficiënt.
CREATE INDEX IF NOT EXISTS stage_points_entry_idx ON public.stage_points(entry_id);

-- Picks/jokers per entry (recalc, vergelijkingen, opslag).
CREATE INDEX IF NOT EXISTS entry_picks_entry_idx ON public.entry_picks(entry_id);
CREATE INDEX IF NOT EXISTS entry_jokers_entry_idx ON public.entry_jokers(entry_id);

-- Veelgebruikte filter: ingediende teams binnen een game (standings/RPC's).
CREATE INDEX IF NOT EXISTS entries_game_status_idx ON public.entries(game_id, status);

-- Categorie-renners per renner (matching/dreamteam).
CREATE INDEX IF NOT EXISTS category_riders_rider_idx ON public.category_riders(rider_id);


-- ########## MIGRATIE: 20260601160000_game_standings_rpc.sql ##########

-- Schaalbare standen: server-side aggregatie i.p.v. alle stage_points-rijen
-- naar de client. Geeft per ingediend team de cumulatieve stand t/m een rit
-- (stage_number = p_upto), incl. rang, rang-delta t.o.v. de vorige rit, de
-- voorspellingsbonus (total_points − som alle etappepunten) en de dag-uitslag
-- van die rit. SECURITY DEFINER zodat ook andermans totalen leesbaar zijn
-- (cross-user, net als game_entries_detail).
--
-- p_upto = stage_number van de geselecteerde rit (de tussenstand-slider).

DROP FUNCTION IF EXISTS public.game_standings(uuid, integer);

CREATE OR REPLACE FUNCTION public.game_standings(p_game_id uuid, p_upto integer)
RETURNS TABLE(
  entry_id uuid,
  user_id uuid,
  team_name text,
  display_name text,
  cum_points integer,
  pred_bonus integer,
  total integer,
  rank integer,
  prev_rank integer,
  delta integer,
  stage_points integer,
  stage_rank integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sp AS (
    SELECT sp.entry_id, s.stage_number, sp.points
    FROM public.stage_points sp
    JOIN public.stages s ON s.id = sp.stage_id
    WHERE s.game_id = p_game_id
  ),
  agg AS (
    SELECT
      e.id AS entry_id,
      e.user_id,
      e.team_name,
      COALESCE((SELECT SUM(x.points) FROM sp x WHERE x.entry_id = e.id AND x.stage_number <= p_upto), 0)::int     AS cum_points,
      COALESCE((SELECT SUM(x.points) FROM sp x WHERE x.entry_id = e.id AND x.stage_number <= p_upto - 1), 0)::int AS prev_cum,
      COALESCE((SELECT SUM(x.points) FROM sp x WHERE x.entry_id = e.id AND x.stage_number = p_upto), 0)::int      AS stage_points,
      COALESCE((SELECT SUM(x.points) FROM sp x WHERE x.entry_id = e.id), 0)::int                                  AS full_sum,
      COALESCE(e.total_points, 0)::int AS total_points
    FROM public.entries e
    WHERE e.game_id = p_game_id AND e.status = 'submitted'
  ),
  wb AS (
    SELECT a.*, GREATEST(0, a.total_points - a.full_sum)::int AS pred_bonus
    FROM agg a
  ),
  ranked AS (
    SELECT
      wb.*,
      (wb.cum_points + wb.pred_bonus) AS total_now,
      RANK() OVER (ORDER BY (wb.cum_points + wb.pred_bonus) DESC)  AS rnk,
      RANK() OVER (ORDER BY (wb.prev_cum + wb.pred_bonus) DESC)    AS prev_rnk,
      CASE WHEN wb.stage_points > 0
           THEN RANK() OVER (ORDER BY wb.stage_points DESC)
      END AS st_rank
    FROM wb
  )
  SELECT
    r.entry_id,
    r.user_id,
    r.team_name,
    COALESCE(p.display_name, NULL) AS display_name,
    r.cum_points,
    r.pred_bonus,
    r.total_now::int AS total,
    r.rnk::int AS rank,
    r.prev_rnk::int AS prev_rank,
    (r.prev_rnk - r.rnk)::int AS delta,
    r.stage_points,
    r.st_rank::int AS stage_rank
  FROM ranked r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  ORDER BY r.rnk, COALESCE(r.team_name, '');
$$;

REVOKE ALL ON FUNCTION public.game_standings(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.game_standings(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.game_standings(uuid, integer) TO authenticated;


-- ########## MIGRATIE: 20260601180000_my_stage_ranks_rpc.sql ##########

-- StageBars: jouw dagklassering per etappe, server-side. Vervangt het ophalen
-- van alle stage_points naar de client. Geeft per etappe (waar jij punten
-- scoorde) jouw rang onder alle ingediende teams. SECURITY DEFINER (leest
-- andermans punten voor de ranking).

DROP FUNCTION IF EXISTS public.my_stage_ranks(uuid, uuid);

CREATE OR REPLACE FUNCTION public.my_stage_ranks(p_game_id uuid, p_user_id uuid)
RETURNS TABLE(stage_id uuid, my_rank integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.stage_id, q.rnk::int AS my_rank
  FROM (
    SELECT sp.stage_id, sp.entry_id,
           RANK() OVER (PARTITION BY sp.stage_id ORDER BY sp.points DESC) AS rnk
    FROM public.stage_points sp
    JOIN public.stages s  ON s.id = sp.stage_id AND s.game_id = p_game_id
    JOIN public.entries e ON e.id = sp.entry_id AND e.status = 'submitted'
    WHERE sp.points > 0
  ) q
  JOIN public.entries me
    ON me.id = q.entry_id
   AND me.game_id = p_game_id
   AND me.user_id = p_user_id
   AND me.status = 'submitted';
$$;

REVOKE ALL ON FUNCTION public.my_stage_ranks(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_stage_ranks(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.my_stage_ranks(uuid, uuid) TO authenticated;


-- ########## MIGRATIE: 20260601200000_game_stage_averages_rpc.sql ##########

-- Hors Catégorie tijdlijn ("Jij vs de Gemiddelde Aap"): gemiddelde stage-punten
-- per etappe over alle ingediende teams, server-side. Vervangt het ophalen van
-- alle stage_points naar de client (deelnemers × etappes) door één geaggregeerde
-- rij per etappe. SECURITY DEFINER (leest andermans punten voor het gemiddelde).

DROP FUNCTION IF EXISTS public.game_stage_averages(uuid);

CREATE OR REPLACE FUNCTION public.game_stage_averages(p_game_id uuid)
RETURNS TABLE(stage_id uuid, avg_points numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.stage_id, AVG(sp.points)::numeric AS avg_points
  FROM public.stage_points sp
  JOIN public.stages s  ON s.id = sp.stage_id AND s.game_id = p_game_id
  JOIN public.entries e ON e.id = sp.entry_id AND e.status = 'submitted'
  GROUP BY sp.stage_id;
$$;

REVOKE ALL ON FUNCTION public.game_stage_averages(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.game_stage_averages(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.game_stage_averages(uuid) TO authenticated;


-- ########## MIGRATIE: 20260602190302_c49208de-a84c-41c0-af62-dd2a950239a3.sql ##########

ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_game_type_check;
ALTER TABLE public.games ADD CONSTRAINT games_game_type_check
  CHECK (game_type = ANY (ARRAY['giro'::text, 'tour'::text, 'tdf'::text, 'vuelta'::text, 'femmes'::text, 'other'::text]));

UPDATE public.games SET theme = 'geel' WHERE theme IS NULL AND game_type = 'femmes';

-- ########## MIGRATIE: 20260603064702_f2ce415a-1fd1-4122-a7ee-6741ca144255.sql ##########

-- 20260601140000_scaling_indexes.sql
CREATE INDEX IF NOT EXISTS stage_points_entry_idx ON public.stage_points(entry_id);
CREATE INDEX IF NOT EXISTS entry_picks_entry_idx ON public.entry_picks(entry_id);
CREATE INDEX IF NOT EXISTS entry_jokers_entry_idx ON public.entry_jokers(entry_id);
CREATE INDEX IF NOT EXISTS entries_game_status_idx ON public.entries(game_id, status);
CREATE INDEX IF NOT EXISTS category_riders_rider_idx ON public.category_riders(rider_id);

-- 20260601160000_game_standings_rpc.sql
DROP FUNCTION IF EXISTS public.game_standings(uuid, integer);

CREATE OR REPLACE FUNCTION public.game_standings(p_game_id uuid, p_upto integer)
RETURNS TABLE(
  entry_id uuid,
  user_id uuid,
  team_name text,
  display_name text,
  cum_points integer,
  pred_bonus integer,
  total integer,
  rank integer,
  prev_rank integer,
  delta integer,
  stage_points integer,
  stage_rank integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sp AS (
    SELECT sp.entry_id, s.stage_number, sp.points
    FROM public.stage_points sp
    JOIN public.stages s ON s.id = sp.stage_id
    WHERE s.game_id = p_game_id
  ),
  agg AS (
    SELECT
      e.id AS entry_id,
      e.user_id,
      e.team_name,
      COALESCE((SELECT SUM(x.points) FROM sp x WHERE x.entry_id = e.id AND x.stage_number <= p_upto), 0)::int     AS cum_points,
      COALESCE((SELECT SUM(x.points) FROM sp x WHERE x.entry_id = e.id AND x.stage_number <= p_upto - 1), 0)::int AS prev_cum,
      COALESCE((SELECT SUM(x.points) FROM sp x WHERE x.entry_id = e.id AND x.stage_number = p_upto), 0)::int      AS stage_points,
      COALESCE((SELECT SUM(x.points) FROM sp x WHERE x.entry_id = e.id), 0)::int                                  AS full_sum,
      COALESCE(e.total_points, 0)::int AS total_points
    FROM public.entries e
    WHERE e.game_id = p_game_id AND e.status = 'submitted'
  ),
  wb AS (
    SELECT a.*, GREATEST(0, a.total_points - a.full_sum)::int AS pred_bonus
    FROM agg a
  ),
  ranked AS (
    SELECT
      wb.*,
      (wb.cum_points + wb.pred_bonus) AS total_now,
      RANK() OVER (ORDER BY (wb.cum_points + wb.pred_bonus) DESC)  AS rnk,
      RANK() OVER (ORDER BY (wb.prev_cum + wb.pred_bonus) DESC)    AS prev_rnk,
      CASE WHEN wb.stage_points > 0
           THEN RANK() OVER (ORDER BY wb.stage_points DESC)
      END AS st_rank
    FROM wb
  )
  SELECT
    r.entry_id,
    r.user_id,
    r.team_name,
    COALESCE(p.display_name, NULL) AS display_name,
    r.cum_points,
    r.pred_bonus,
    r.total_now::int AS total,
    r.rnk::int AS rank,
    r.prev_rnk::int AS prev_rank,
    (r.prev_rnk - r.rnk)::int AS delta,
    r.stage_points,
    r.st_rank::int AS stage_rank
  FROM ranked r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  ORDER BY r.rnk, COALESCE(r.team_name, '');
$$;

REVOKE ALL ON FUNCTION public.game_standings(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.game_standings(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.game_standings(uuid, integer) TO authenticated;

-- ########## MIGRATIE: 20260603092032_4bfd1161-49e4-43c3-bb70-cd35c699b460.sql ##########

-- Hors Catégorie tijdlijn ("Jij vs de Gemiddelde Aap"): gemiddelde stage-punten
-- per etappe over alle ingediende teams, server-side. Vervangt het ophalen van
-- alle stage_points naar de client (deelnemers × etappes) door één geaggregeerde
-- rij per etappe. SECURITY DEFINER (leest andermans punten voor het gemiddelde).

DROP FUNCTION IF EXISTS public.game_stage_averages(uuid);

CREATE OR REPLACE FUNCTION public.game_stage_averages(p_game_id uuid)
RETURNS TABLE(stage_id uuid, avg_points numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.stage_id, AVG(sp.points)::numeric AS avg_points
  FROM public.stage_points sp
  JOIN public.stages s  ON s.id = sp.stage_id AND s.game_id = p_game_id
  JOIN public.entries e ON e.id = sp.entry_id AND e.status = 'submitted'
  GROUP BY sp.stage_id;
$$;

REVOKE ALL ON FUNCTION public.game_stage_averages(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.game_stage_averages(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.game_stage_averages(uuid) TO authenticated;

-- ########## MIGRATIE: 20260603103253_d05bba24-0588-49fb-b740-66101a2e389d.sql ##########

-- ── 1) chat_message_reactions.subpoule_id ───────────────────────────────────
ALTER TABLE public.chat_message_reactions
  ADD COLUMN IF NOT EXISTS subpoule_id uuid;

UPDATE public.chat_message_reactions r
SET subpoule_id = m.subpoule_id
FROM public.chat_messages m
WHERE r.message_id = m.id
  AND r.subpoule_id IS DISTINCT FROM m.subpoule_id;

CREATE OR REPLACE FUNCTION public.set_reaction_subpoule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.subpoule_id IS NULL THEN
    SELECT m.subpoule_id INTO NEW.subpoule_id
    FROM public.chat_messages m
    WHERE m.id = NEW.message_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_reaction_subpoule ON public.chat_message_reactions;
CREATE TRIGGER trg_set_reaction_subpoule
  BEFORE INSERT ON public.chat_message_reactions
  FOR EACH ROW EXECUTE FUNCTION public.set_reaction_subpoule();

CREATE INDEX IF NOT EXISTS idx_chat_reactions_subpoule
  ON public.chat_message_reactions(subpoule_id);

ALTER TABLE public.chat_message_reactions REPLICA IDENTITY FULL;

-- ── 2) chat_poll_votes.subpoule_id ──────────────────────────────────────────
ALTER TABLE public.chat_poll_votes
  ADD COLUMN IF NOT EXISTS subpoule_id uuid;

UPDATE public.chat_poll_votes v
SET subpoule_id = p.subpoule_id
FROM public.chat_polls p
WHERE v.poll_id = p.id
  AND v.subpoule_id IS DISTINCT FROM p.subpoule_id;

CREATE OR REPLACE FUNCTION public.set_vote_subpoule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.subpoule_id IS NULL THEN
    SELECT p.subpoule_id INTO NEW.subpoule_id
    FROM public.chat_polls p
    WHERE p.id = NEW.poll_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_vote_subpoule ON public.chat_poll_votes;
CREATE TRIGGER trg_set_vote_subpoule
  BEFORE INSERT ON public.chat_poll_votes
  FOR EACH ROW EXECUTE FUNCTION public.set_vote_subpoule();

CREATE INDEX IF NOT EXISTS idx_chat_poll_votes_subpoule
  ON public.chat_poll_votes(subpoule_id);

ALTER TABLE public.chat_poll_votes REPLICA IDENTITY FULL;

-- ########## MIGRATIE: 20260603110941_a97e14af-faf0-422b-888a-748aff198d23.sql ##########

-- 1) Voorbereiden
CREATE OR REPLACE FUNCTION public.recalc_prepare(p_game_id uuid)
RETURNS TABLE(stage_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  DELETE FROM public.stage_points
  WHERE stage_id IN (SELECT id FROM public.stages WHERE game_id = p_game_id);

  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  RETURN QUERY
    SELECT id FROM public.stages
    WHERE game_id = p_game_id AND results_status = 'approved'
    ORDER BY stage_number;
END $$;

-- 2) Eén etappe (her)berekenen
CREATE OR REPLACE FUNCTION public.recalc_stage(p_game_id uuid, p_stage_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.stages WHERE id = p_stage_id AND game_id = p_game_id
  ) THEN
    RAISE EXCEPTION 'Stage % hoort niet bij game %', p_stage_id, p_game_id;
  END IF;

  PERFORM public.calculate_stage_scores(p_stage_id);
END $$;

-- 3) Afronden
CREATE OR REPLACE FUNCTION public.recalc_finalize(p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  PERFORM public.calculate_prediction_points(p_game_id);
  PERFORM public.update_total_ranking(p_game_id);
END $$;

REVOKE ALL ON FUNCTION public.recalc_prepare(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalc_stage(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalc_finalize(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalc_prepare(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalc_stage(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalc_finalize(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.recalc_prepare(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_stage(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_finalize(uuid) TO authenticated;

-- ########## MIGRATIE: 20260603120000_chat_realtime_scope.sql ##########

-- Chat realtime schaalbaar maken.
--
-- Probleem: chat_message_reactions en chat_poll_votes droegen geen subpoule_id,
-- dus de realtime postgres_changes-subscriptions konden er niet op filteren.
-- Daardoor kreeg ELKE client ELKE reactie/poll-stem van de HELE site binnen
-- (wereldwijde fan-out). Bij veel deelnemers = veel egress/realtime-ruis.
--
-- Oplossing: subpoule_id denormaliseren op beide tabellen (backfill + trigger),
-- zodat de client per subpoule kan filteren. REPLICA IDENTITY FULL zodat ook
-- DELETE-events de kolom meesturen (anders matcht het filter niet op delete).

-- ── 1) chat_message_reactions.subpoule_id ───────────────────────────────────
ALTER TABLE public.chat_message_reactions
  ADD COLUMN IF NOT EXISTS subpoule_id uuid;

UPDATE public.chat_message_reactions r
SET subpoule_id = m.subpoule_id
FROM public.chat_messages m
WHERE r.message_id = m.id
  AND r.subpoule_id IS DISTINCT FROM m.subpoule_id;

CREATE OR REPLACE FUNCTION public.set_reaction_subpoule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.subpoule_id IS NULL THEN
    SELECT m.subpoule_id INTO NEW.subpoule_id
    FROM public.chat_messages m
    WHERE m.id = NEW.message_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_reaction_subpoule ON public.chat_message_reactions;
CREATE TRIGGER trg_set_reaction_subpoule
  BEFORE INSERT ON public.chat_message_reactions
  FOR EACH ROW EXECUTE FUNCTION public.set_reaction_subpoule();

CREATE INDEX IF NOT EXISTS idx_chat_reactions_subpoule
  ON public.chat_message_reactions(subpoule_id);

ALTER TABLE public.chat_message_reactions REPLICA IDENTITY FULL;

-- ── 2) chat_poll_votes.subpoule_id ──────────────────────────────────────────
ALTER TABLE public.chat_poll_votes
  ADD COLUMN IF NOT EXISTS subpoule_id uuid;

UPDATE public.chat_poll_votes v
SET subpoule_id = p.subpoule_id
FROM public.chat_polls p
WHERE v.poll_id = p.id
  AND v.subpoule_id IS DISTINCT FROM p.subpoule_id;

CREATE OR REPLACE FUNCTION public.set_vote_subpoule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.subpoule_id IS NULL THEN
    SELECT p.subpoule_id INTO NEW.subpoule_id
    FROM public.chat_polls p
    WHERE p.id = NEW.poll_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_vote_subpoule ON public.chat_poll_votes;
CREATE TRIGGER trg_set_vote_subpoule
  BEFORE INSERT ON public.chat_poll_votes
  FOR EACH ROW EXECUTE FUNCTION public.set_vote_subpoule();

CREATE INDEX IF NOT EXISTS idx_chat_poll_votes_subpoule
  ON public.chat_poll_votes(subpoule_id);

ALTER TABLE public.chat_poll_votes REPLICA IDENTITY FULL;


-- ########## MIGRATIE: 20260603140000_recalc_batched.sql ##########

-- Batched recalculation: full_recalculation deed alles in één statement
-- (wipe → loop alle goedgekeurde etappes → voorspellingen → totalen). Bij veel
-- deelnemers × etappes overschrijdt dat de statement_timeout en faalt de hele
-- herberekening. We splitsen het in losse RPCs die de edge function per etappe
-- aanroept, zodat elke call kort blijft en apart commit.
--
-- full_recalculation blijft bestaan als fallback (atomair, voor kleine games).

-- 1) Voorbereiden: wis bestaande punten en geef de te (her)berekenen etappes terug.
CREATE OR REPLACE FUNCTION public.recalc_prepare(p_game_id uuid)
RETURNS TABLE(stage_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  DELETE FROM public.stage_points
  WHERE stage_id IN (SELECT id FROM public.stages WHERE game_id = p_game_id);

  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  RETURN QUERY
    SELECT id FROM public.stages
    WHERE game_id = p_game_id AND results_status = 'approved'
    ORDER BY stage_number;
END $$;

-- 2) Eén etappe (her)berekenen.
CREATE OR REPLACE FUNCTION public.recalc_stage(p_game_id uuid, p_stage_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.stages WHERE id = p_stage_id AND game_id = p_game_id
  ) THEN
    RAISE EXCEPTION 'Stage % hoort niet bij game %', p_stage_id, p_game_id;
  END IF;

  PERFORM public.calculate_stage_scores(p_stage_id);
END $$;

-- 3) Afronden: voorspellingspunten + totaalstand.
CREATE OR REPLACE FUNCTION public.recalc_finalize(p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  PERFORM public.calculate_prediction_points(p_game_id);
  PERFORM public.update_total_ranking(p_game_id);
END $$;

REVOKE ALL ON FUNCTION public.recalc_prepare(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalc_stage(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalc_finalize(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalc_prepare(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalc_stage(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalc_finalize(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.recalc_prepare(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_stage(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_finalize(uuid) TO authenticated;


-- ########## MIGRATIE: 20260604120000_team_jersey_url.sql ##########

-- Ploeg-trui (kit-afbeelding) per team. De admin uploadt per team een trui in
-- de Startlijst-tab; de afbeelding wordt in storage gezet en de publieke URL
-- hier bewaard. Toont in "Stel je team samen → Startlijst" naast elke ploeg.
-- Bewust een losse kolom op teams, zodat een nieuwe startlijst-import (die teams
-- op naam hergebruikt) de trui niet wist.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS jersey_url text;


-- ########## MIGRATIE: 20260604160000_mark_subpoule_read_noop.sql ##########

-- mark_subpoule_read wierp een EXCEPTION als auth.uid() NULL was. Die functie
-- wordt bij elke chat-open/-sluit aangeroepen (PelotonChat, ook bij auth-events
-- als de client-user-ref wisselt). Zonder geldige JWT (anon "rondkijken" of een
-- korte token-refresh-race) faalde de call → de transactie rolde terug. Dat
-- veroorzaakte een berg rolled-back transactions (+ WAL-ruis) op een verder
-- kleine database.
--
-- Fix: niet meer RAISEn maar stil RETURNen wanneer er geen ingelogde gebruiker
-- is. Dan committeert de transactie zonder write i.p.v. een rollback. Gedrag
-- voor ingelogde gebruikers blijft identiek (upsert van de leesstatus).

CREATE OR REPLACE FUNCTION public.mark_subpoule_read(p_subpoule_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN; -- geen ingelogde gebruiker: no-op i.p.v. exception (voorkomt rollback)
  END IF;
  INSERT INTO public.chat_read_states (subpoule_id, user_id, last_read_at, updated_at)
  VALUES (p_subpoule_id, auth.uid(), now(), now())
  ON CONFLICT (subpoule_id, user_id)
  DO UPDATE SET last_read_at = now(), updated_at = now();
END $$;


-- ########## MIGRATIE: 20260604180927_1fe3e155-4c8f-4b15-967b-9fa481e735bc.sql ##########

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS jersey_url text;

-- ########## MIGRATIE: 20260604182247_b9b81c02-c409-4ab4-b075-9a503af71395.sql ##########

CREATE OR REPLACE FUNCTION public.mark_subpoule_read(p_subpoule_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.chat_read_states (subpoule_id, user_id, last_read_at, updated_at)
  VALUES (p_subpoule_id, auth.uid(), now(), now())
  ON CONFLICT (subpoule_id, user_id)
  DO UPDATE SET last_read_at = now(), updated_at = now();
END $$;

-- ########## MIGRATIE: 20260604185219_b0f24883-bd20-425e-85d1-eca4794e9977.sql ##########

-- Read policy (anon + authenticated) op private team-jerseys bucket
DROP POLICY IF EXISTS "team_jerseys_read" ON storage.objects;
drop policy if exists "team_jerseys_read" on storage.objects;
CREATE POLICY "team_jerseys_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'team-jerseys');

-- Zorg dat is_admin() callable is vanuit RLS
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "team_jerseys_admin_insert" ON storage.objects;
drop policy if exists "team_jerseys_admin_insert" on storage.objects;
CREATE POLICY "team_jerseys_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team-jerseys' AND public.is_admin());

DROP POLICY IF EXISTS "team_jerseys_admin_update" ON storage.objects;
drop policy if exists "team_jerseys_admin_update" on storage.objects;
CREATE POLICY "team_jerseys_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'team-jerseys' AND public.is_admin())
  WITH CHECK (bucket_id = 'team-jerseys' AND public.is_admin());

DROP POLICY IF EXISTS "team_jerseys_admin_delete" ON storage.objects;
drop policy if exists "team_jerseys_admin_delete" on storage.objects;
CREATE POLICY "team_jerseys_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'team-jerseys' AND public.is_admin());

-- ########## MIGRATIE: 20260604200000_team_jerseys_bucket.sql ##########

-- Eigen storage-bucket voor ploeg-truien (kit-afbeeldingen). Eerder werd de
-- stage-profiles-bucket hergebruikt, maar de upload gaf "new row violates
-- row-level security policy" — de hand-genaamde storage-policies van die bucket
-- zijn kennelijk niet (volledig) toegepast. Hier een schone, expliciete set
-- policies in een aparte bucket, zodat admin-upload betrouwbaar werkt.
--
-- Publiek leesbaar (truien tonen in de app). Schrijven alleen voor ingelogde
-- admins (public.is_admin() = has_role(uid,'admin') via user_roles, dezelfde
-- bron als de admin-gate van de app).

INSERT INTO storage.buckets (id, name, public)
VALUES ('team-jerseys', 'team-jerseys', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Zorg dat de admin-check aanroepbaar is vanuit de RLS-policies.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "team_jerseys_read" ON storage.objects;
drop policy if exists "team_jerseys_read" on storage.objects;
CREATE POLICY "team_jerseys_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'team-jerseys');

DROP POLICY IF EXISTS "team_jerseys_admin_insert" ON storage.objects;
drop policy if exists "team_jerseys_admin_insert" on storage.objects;
CREATE POLICY "team_jerseys_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team-jerseys' AND public.is_admin());

DROP POLICY IF EXISTS "team_jerseys_admin_update" ON storage.objects;
drop policy if exists "team_jerseys_admin_update" on storage.objects;
CREATE POLICY "team_jerseys_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'team-jerseys' AND public.is_admin())
  WITH CHECK (bucket_id = 'team-jerseys' AND public.is_admin());

DROP POLICY IF EXISTS "team_jerseys_admin_delete" ON storage.objects;
drop policy if exists "team_jerseys_admin_delete" on storage.objects;
CREATE POLICY "team_jerseys_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'team-jerseys' AND public.is_admin());


-- ########## MIGRATIE: 20260607172521_c578c0da-c900-4cd3-bff8-811ea374cca3.sql ##########

-- Hard search_path lock (defense-in-depth; al gezet maar idempotent)
alter function public.is_admin() set search_path = public, pg_temp;
alter function public.game_entries_standings(uuid) set search_path = public, pg_temp;
alter function public.game_standings(uuid, integer) set search_path = public, pg_temp;

-- Sluit PUBLIC af, herbevestig grants
revoke all on function public.is_admin() from public;
revoke all on function public.game_entries_standings(uuid) from public;
revoke all on function public.game_standings(uuid, integer) from public;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.game_entries_standings(uuid) to anon, authenticated;
grant execute on function public.game_standings(uuid, integer) to anon, authenticated;

-- ########## MIGRATIE: 20260608160900_f8b7a2da-ff1d-4dd4-9724-ba70ebc2dd44.sql ##########

-- Fix 1: Realtime messages — drop the allow-all SELECT policy so deny-all/topic-scoped policies win
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages;

-- Fix 2: team-jerseys public bucket — drop broad SELECT policy that allows listing.
-- Files remain downloadable via public CDN URLs (bucket is public), but clients can no longer enumerate the bucket.
DROP POLICY IF EXISTS "team_jerseys_read" ON storage.objects;

-- ########## MIGRATIE: 20260608170000_rider_stage_points_rpc.sql ##########

-- rider_stage_points: per-stage punten die één renner heeft gescoord binnen
-- een game. Gebruikt voor de inline "dossier"-dropdown onder een renner in
-- Mijn Ploeg.
--
-- Bron van waarheid = calculate_stage_scores(): een renner scoort etappe-
-- punten op basis van finish_position (klassement 'stage'), posities 1..20,
-- alleen als did_finish. KOM/GC/jeugd/punten-klassementen zitten NIET in de
-- per-etappe rennerpunten (die lopen via prediction-points), dus die nemen we
-- hier bewust niet mee — anders zou het totaal niet matchen met stage_points.
--
-- Joker: als p_entry_id is meegegeven en de renner staat als joker bij die
-- entry, dan telt joker_multiplier (zelfde regel als calculate_stage_scores).
-- Zonder p_entry_id is multiplier altijd 1 (kale rennerpunten).
--
-- Alleen GOEDGEKEURDE, niet-GC etappes. Alle goedgekeurde etappes komen terug
-- (ook 0-punten), zodat de UI een volledige tijdlijn kan tonen.

CREATE OR REPLACE FUNCTION public.rider_stage_points(
  p_game_id uuid,
  p_rider_id uuid,
  p_entry_id uuid DEFAULT NULL
)
RETURNS TABLE (
  stage_id uuid,
  stage_number int,
  stage_name text,
  stage_type text,
  finish_position int,
  base_points int,
  multiplier int,
  total_points int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH cfg AS (
    SELECT COALESCE(g.joker_multiplier, 2) AS mult
    FROM public.games g
    WHERE g.id = p_game_id
  ),
  joker AS (
    SELECT EXISTS (
      SELECT 1 FROM public.entry_jokers ej
      WHERE ej.entry_id = p_entry_id
        AND ej.rider_id = p_rider_id
    ) AS is_joker
  )
  SELECT
    s.id AS stage_id,
    s.stage_number,
    s.name AS stage_name,
    s.stage_type,
    sr.finish_position,
    COALESCE(ps.points, 0) AS base_points,
    CASE
      WHEN p_entry_id IS NOT NULL AND (SELECT is_joker FROM joker)
        THEN (SELECT mult FROM cfg)
      ELSE 1
    END AS multiplier,
    (
      COALESCE(ps.points, 0)
      * CASE
          WHEN p_entry_id IS NOT NULL AND (SELECT is_joker FROM joker)
            THEN (SELECT mult FROM cfg)
          ELSE 1
        END
    )::int AS total_points
  FROM public.stages s
  LEFT JOIN public.stage_results sr
    ON sr.stage_id = s.id
   AND sr.rider_id = p_rider_id
   AND COALESCE(sr.did_finish, true) = true
   AND sr.finish_position BETWEEN 1 AND 20
  LEFT JOIN public.points_schema ps
    ON ps.game_id = p_game_id
   AND ps.classification = 'stage'
   AND ps.position = sr.finish_position
  WHERE s.game_id = p_game_id
    AND s.results_status = 'approved'
    AND COALESCE(s.is_gc, false) = false
  ORDER BY s.stage_number;
$$;

-- Rechten: team sheets zijn publiek leesbaar, dus authenticated + anon mogen
-- deze RPC aanroepen. Eerst alles intrekken om defaults te resetten.
REVOKE ALL ON FUNCTION public.rider_stage_points(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rider_stage_points(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rider_stage_points(uuid, uuid, uuid) TO anon;

-- Index voor de rider-filter op stage_results (stage_id-index bestond al).
CREATE INDEX IF NOT EXISTS stage_results_rider_idx
  ON public.stage_results(rider_id);
CREATE INDEX IF NOT EXISTS stage_results_game_rider_idx
  ON public.stage_results(game_id, rider_id);

-- rider_entry_totals: totaal behaalde etappepunten PER RENNER voor één entry,
-- t/m de laatst gefiatteerde (approved) niet-GC etappe. Eén query voor de hele
-- ploeg, zodat elke renner-tegel z'n totaal kan tonen zonder N losse calls.
--
-- Zelfde scoring-regel als rider_stage_points/calculate_stage_scores:
-- finish_position (klassement 'stage', pos 1..20, did_finish) × joker-mult.
-- Joker-mult geldt alleen voor renners die joker zijn bij DEZE entry.
CREATE OR REPLACE FUNCTION public.rider_entry_totals(
  p_game_id uuid,
  p_entry_id uuid
)
RETURNS TABLE (
  rider_id uuid,
  total_points int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH cfg AS (
    SELECT COALESCE(g.joker_multiplier, 2) AS mult
    FROM public.games g WHERE g.id = p_game_id
  )
  SELECT
    sr.rider_id,
    COALESCE(SUM(
      COALESCE(ps.points, 0)
      * CASE WHEN ej.rider_id IS NOT NULL THEN (SELECT mult FROM cfg) ELSE 1 END
    ), 0)::int AS total_points
  FROM public.stage_results sr
  JOIN public.stages s
    ON s.id = sr.stage_id
   AND s.game_id = p_game_id
   AND s.results_status = 'approved'
   AND COALESCE(s.is_gc, false) = false
  LEFT JOIN public.points_schema ps
    ON ps.game_id = p_game_id
   AND ps.classification = 'stage'
   AND ps.position = sr.finish_position
  LEFT JOIN public.entry_jokers ej
    ON ej.entry_id = p_entry_id
   AND ej.rider_id = sr.rider_id
  WHERE COALESCE(sr.did_finish, true) = true
    AND sr.finish_position BETWEEN 1 AND 20
  GROUP BY sr.rider_id;
$$;

REVOKE ALL ON FUNCTION public.rider_entry_totals(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rider_entry_totals(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rider_entry_totals(uuid, uuid) TO anon;


-- ########## MIGRATIE: 20260608172830_27c5531a-8d58-45c7-a0bc-68835937b9d0.sql ##########

CREATE OR REPLACE FUNCTION public.rider_stage_points(
  p_game_id uuid,
  p_rider_id uuid,
  p_entry_id uuid DEFAULT NULL
)
RETURNS TABLE (
  stage_id uuid,
  stage_number int,
  stage_name text,
  stage_type text,
  finish_position int,
  base_points int,
  multiplier int,
  total_points int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH cfg AS (
    SELECT COALESCE(g.joker_multiplier, 2) AS mult
    FROM public.games g
    WHERE g.id = p_game_id
  ),
  joker AS (
    SELECT EXISTS (
      SELECT 1 FROM public.entry_jokers ej
      WHERE ej.entry_id = p_entry_id
        AND ej.rider_id = p_rider_id
    ) AS is_joker
  )
  SELECT
    s.id AS stage_id,
    s.stage_number,
    s.name AS stage_name,
    s.stage_type,
    sr.finish_position,
    COALESCE(ps.points, 0) AS base_points,
    CASE
      WHEN p_entry_id IS NOT NULL AND (SELECT is_joker FROM joker)
        THEN (SELECT mult FROM cfg)
      ELSE 1
    END AS multiplier,
    (
      COALESCE(ps.points, 0)
      * CASE
          WHEN p_entry_id IS NOT NULL AND (SELECT is_joker FROM joker)
            THEN (SELECT mult FROM cfg)
          ELSE 1
        END
    )::int AS total_points
  FROM public.stages s
  LEFT JOIN public.stage_results sr
    ON sr.stage_id = s.id
   AND sr.rider_id = p_rider_id
   AND COALESCE(sr.did_finish, true) = true
   AND sr.finish_position BETWEEN 1 AND 20
  LEFT JOIN public.points_schema ps
    ON ps.game_id = p_game_id
   AND ps.classification = 'stage'
   AND ps.position = sr.finish_position
  WHERE s.game_id = p_game_id
    AND s.results_status = 'approved'
    AND COALESCE(s.is_gc, false) = false
  ORDER BY s.stage_number;
$$;

REVOKE ALL ON FUNCTION public.rider_stage_points(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rider_stage_points(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rider_stage_points(uuid, uuid, uuid) TO anon;

CREATE INDEX IF NOT EXISTS stage_results_rider_idx
  ON public.stage_results(rider_id);
CREATE INDEX IF NOT EXISTS stage_results_game_rider_idx
  ON public.stage_results(game_id, rider_id);

-- ########## MIGRATIE: 20260608182203_bf639c08-d53b-44b5-b5a5-6691d4ad7bc8.sql ##########

-- rider_stage_points: per-stage punten die één renner heeft gescoord binnen
-- een game. Gebruikt voor de inline "dossier"-dropdown onder een renner in
-- Mijn Ploeg.
--
-- Bron van waarheid = calculate_stage_scores(): een renner scoort etappe-
-- punten op basis van finish_position (klassement 'stage'), posities 1..20,
-- alleen als did_finish. KOM/GC/jeugd/punten-klassementen zitten NIET in de
-- per-etappe rennerpunten (die lopen via prediction-points), dus die nemen we
-- hier bewust niet mee — anders zou het totaal niet matchen met stage_points.
--
-- Joker: als p_entry_id is meegegeven en de renner staat als joker bij die
-- entry, dan telt joker_multiplier (zelfde regel als calculate_stage_scores).
-- Zonder p_entry_id is multiplier altijd 1 (kale rennerpunten).
--
-- Alleen GOEDGEKEURDE, niet-GC etappes. Alle goedgekeurde etappes komen terug
-- (ook 0-punten), zodat de UI een volledige tijdlijn kan tonen.

CREATE OR REPLACE FUNCTION public.rider_stage_points(
  p_game_id uuid,
  p_rider_id uuid,
  p_entry_id uuid DEFAULT NULL
)
RETURNS TABLE (
  stage_id uuid,
  stage_number int,
  stage_name text,
  stage_type text,
  finish_position int,
  base_points int,
  multiplier int,
  total_points int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH cfg AS (
    SELECT COALESCE(g.joker_multiplier, 2) AS mult
    FROM public.games g
    WHERE g.id = p_game_id
  ),
  joker AS (
    SELECT EXISTS (
      SELECT 1 FROM public.entry_jokers ej
      WHERE ej.entry_id = p_entry_id
        AND ej.rider_id = p_rider_id
    ) AS is_joker
  )
  SELECT
    s.id AS stage_id,
    s.stage_number,
    s.name AS stage_name,
    s.stage_type,
    sr.finish_position,
    COALESCE(ps.points, 0) AS base_points,
    CASE
      WHEN p_entry_id IS NOT NULL AND (SELECT is_joker FROM joker)
        THEN (SELECT mult FROM cfg)
      ELSE 1
    END AS multiplier,
    (
      COALESCE(ps.points, 0)
      * CASE
          WHEN p_entry_id IS NOT NULL AND (SELECT is_joker FROM joker)
            THEN (SELECT mult FROM cfg)
          ELSE 1
        END
    )::int AS total_points
  FROM public.stages s
  LEFT JOIN public.stage_results sr
    ON sr.stage_id = s.id
   AND sr.rider_id = p_rider_id
   AND COALESCE(sr.did_finish, true) = true
   AND sr.finish_position BETWEEN 1 AND 20
  LEFT JOIN public.points_schema ps
    ON ps.game_id = p_game_id
   AND ps.classification = 'stage'
   AND ps.position = sr.finish_position
  WHERE s.game_id = p_game_id
    AND s.results_status = 'approved'
    AND COALESCE(s.is_gc, false) = false
  ORDER BY s.stage_number;
$$;

-- Rechten: team sheets zijn publiek leesbaar, dus authenticated + anon mogen
-- deze RPC aanroepen. Eerst alles intrekken om defaults te resetten.
REVOKE ALL ON FUNCTION public.rider_stage_points(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rider_stage_points(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rider_stage_points(uuid, uuid, uuid) TO anon;

-- Index voor de rider-filter op stage_results (stage_id-index bestond al).
CREATE INDEX IF NOT EXISTS stage_results_rider_idx
  ON public.stage_results(rider_id);
CREATE INDEX IF NOT EXISTS stage_results_game_rider_idx
  ON public.stage_results(game_id, rider_id);

-- rider_entry_totals: totaal behaalde etappepunten PER RENNER voor één entry,
-- t/m de laatst gefiatteerde (approved) niet-GC etappe. Eén query voor de hele
-- ploeg, zodat elke renner-tegel z'n totaal kan tonen zonder N losse calls.
--
-- Zelfde scoring-regel als rider_stage_points/calculate_stage_scores:
-- finish_position (klassement 'stage', pos 1..20, did_finish) × joker-mult.
-- Joker-mult geldt alleen voor renners die joker zijn bij DEZE entry.
CREATE OR REPLACE FUNCTION public.rider_entry_totals(
  p_game_id uuid,
  p_entry_id uuid
)
RETURNS TABLE (
  rider_id uuid,
  total_points int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH cfg AS (
    SELECT COALESCE(g.joker_multiplier, 2) AS mult
    FROM public.games g WHERE g.id = p_game_id
  )
  SELECT
    sr.rider_id,
    COALESCE(SUM(
      COALESCE(ps.points, 0)
      * CASE WHEN ej.rider_id IS NOT NULL THEN (SELECT mult FROM cfg) ELSE 1 END
    ), 0)::int AS total_points
  FROM public.stage_results sr
  JOIN public.stages s
    ON s.id = sr.stage_id
   AND s.game_id = p_game_id
   AND s.results_status = 'approved'
   AND COALESCE(s.is_gc, false) = false
  LEFT JOIN public.points_schema ps
    ON ps.game_id = p_game_id
   AND ps.classification = 'stage'
   AND ps.position = sr.finish_position
  LEFT JOIN public.entry_jokers ej
    ON ej.entry_id = p_entry_id
   AND ej.rider_id = sr.rider_id
  WHERE COALESCE(sr.did_finish, true) = true
    AND sr.finish_position BETWEEN 1 AND 20
  GROUP BY sr.rider_id;
$$;

REVOKE ALL ON FUNCTION public.rider_entry_totals(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rider_entry_totals(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rider_entry_totals(uuid, uuid) TO anon;

-- ########## MIGRATIE: 20260612064348_3697b4a3-bb83-4daf-9d53-b13acba8a9f7.sql ##########

ALTER TABLE public.games ADD COLUMN IF NOT EXISTS homepage_quote text, ADD COLUMN IF NOT EXISTS homepage_quote_author text;

-- ########## MIGRATIE: 20260613095818_8956eaf4-f40d-4a67-b4d0-c75e3174770f.sql ##########

-- ───────────────────────────────────────────────────────────────────────────
-- Subpoule-slugs: nette, deelbare URLs (/subpoule/<naam>).
-- Voegt een slug-kolom + slugify/ensure_unique_slug helpers toe, backfilt
-- bestaande rijen, laat create_subpoule een slug zetten en voegt een
-- SECURITY DEFINER resolver toe zodat een niet-lid via de link kan landen.
-- Idempotent waar mogelijk (if not exists / or replace).
-- ───────────────────────────────────────────────────────────────────────────

-- 1. Kolom + unieke (case-insensitive) index.
alter table public.subpoules add column if not exists slug text;
create unique index if not exists subpoules_slug_lower_idx
  on public.subpoules (lower(slug));

-- 2. Slugify — immutable, geen extensie-afhankelijkheid. Accenten via translate
--    (1:1), ß apart, daarna alles behalve [a-z0-9] → '-', samenvouwen, trimmen.
--    Lege uitkomst → 'subpoule'.
create or replace function public.slugify(p_text text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            translate(
              replace(lower(coalesce(p_text, '')), 'ß', 'ss'),
              'áàâäãåçćčéèêëēěėęíìîïīįıñńňóòôöõøōőśšúùûüūůűýÿžźżğďł',
              'aaaaaaccceeeeeeeeiiiiiiinnnoooooooossuuuuuuuyyzzzgdl'
            ),
            '[^a-z0-9]+', '-', 'g'
          ),
          '-{2,}', '-', 'g'
        ),
        '(^-|-$)', '', 'g'
      ),
    ''),
    'subpoule'
  );
$$;

-- 3. Genereer een uniek slug uit een basis-tekst; bij botsing -2, -3, …
create or replace function public.ensure_unique_slug(p_base text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text := public.slugify(p_base);
  v_slug text := v_base;
  v_n int := 1;
begin
  while exists (select 1 from public.subpoules where lower(slug) = lower(v_slug)) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  return v_slug;
end $$;

-- 4. Backfill bestaande subpoules (per rij, oudste eerst → stabiele -2/-3).
do $$
declare r record;
begin
  for r in select id, name from public.subpoules where slug is null order by created_at, id loop
    update public.subpoules set slug = public.ensure_unique_slug(r.name) where id = r.id;
  end loop;
end $$;

alter table public.subpoules alter column slug set not null;

-- 5. create_subpoule zet nu ook een uniek slug (returnwaarde ongemoeid).
create or replace function public.create_subpoule(
  p_name text,
  p_game_id uuid,
  p_code text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_code text := coalesce(p_code, upper(substr(md5(random()::text), 1, 6)));
  v_slug text := public.ensure_unique_slug(p_name);
begin
  if v_uid is null then raise exception 'Niet ingelogd'; end if;

  insert into public.subpoules(name, game_id, code, owner_user_id, slug)
  values (p_name, p_game_id, v_code, v_uid, v_slug)
  returning id into v_id;

  insert into public.subpoule_members(subpoule_id, user_id)
  values (v_id, v_uid)
  on conflict do nothing;

  return v_id;
end $$;

grant execute on function public.create_subpoule(text, uuid, text) to authenticated;

-- 6. Resolver: slug → {id,name,code,game_id}. SECURITY DEFINER omzeilt BEWUST
--    RLS zodat een niet-lid via de link kan landen + joinen (een slug-URL is
--    feitelijk een invite-link, net als de code). Geeft alleen deze velden terug.
create or replace function public.resolve_subpoule_by_slug(p_slug text)
returns table(id uuid, name text, code text, game_id uuid)
language sql
security definer
set search_path = public
as $$
  select id, name, code, game_id
  from public.subpoules
  where lower(slug) = lower(p_slug)
  limit 1;
$$;

grant execute on function public.resolve_subpoule_by_slug(text) to authenticated;

-- ########## MIGRATIE: 20260613100000_homepage_quote_size.sql ##########

-- Instelbare fontgrootte (px) voor de homepage-hero-quote, beheerd in
-- Admin → Rubriek → Homepage quote. NULL = frontend-default.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS homepage_quote_size integer;


-- ########## MIGRATIE: 20260613100325_61bb593b-2366-4343-acb2-6480a76fa8dc.sql ##########

CREATE OR REPLACE FUNCTION public.slugify(p_text text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path = public
AS $function$
  select coalesce(
    nullif(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            translate(
              replace(lower(coalesce(p_text, '')), 'ß', 'ss'),
              'áàâäãåçćčéèêëēěėęíìîïīįıñńňóòôöõøōőśšúùûüūůűýÿžźżğďł',
              'aaaaaaccceeeeeeeeiiiiiiinnnoooooooossuuuuuuuyyzzzgdl'
            ),
            '[^a-z0-9]+', '-', 'g'
          ),
          '-{2,}', '-', 'g'
        ),
        '(^-|-$)', '', 'g'
      ),
    ''),
    'subpoule'
  );
$function$;

-- ########## MIGRATIE: 20260613_subpoule_slugs.sql ##########

-- ───────────────────────────────────────────────────────────────────────────
-- Subpoule-slugs: nette, deelbare URLs (/subpoule/<naam>).
-- Voegt een slug-kolom + slugify/ensure_unique_slug helpers toe, backfilt
-- bestaande rijen, laat create_subpoule een slug zetten en voegt een
-- SECURITY DEFINER resolver toe zodat een niet-lid via de link kan landen.
-- Idempotent waar mogelijk (if not exists / or replace).
-- ───────────────────────────────────────────────────────────────────────────

-- 1. Kolom + unieke (case-insensitive) index.
alter table public.subpoules add column if not exists slug text;
create unique index if not exists subpoules_slug_lower_idx
  on public.subpoules (lower(slug));

-- 2. Slugify — immutable, geen extensie-afhankelijkheid. Accenten via translate
--    (1:1), ß apart, daarna alles behalve [a-z0-9] → '-', samenvouwen, trimmen.
--    Lege uitkomst → 'subpoule'.
create or replace function public.slugify(p_text text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            translate(
              replace(lower(coalesce(p_text, '')), 'ß', 'ss'),
              'áàâäãåçćčéèêëēěėęíìîïīįıñńňóòôöõøōőśšúùûüūůűýÿžźżğďł',
              'aaaaaaccceeeeeeeeiiiiiiinnnoooooooossuuuuuuuyyzzzgdl'
            ),
            '[^a-z0-9]+', '-', 'g'
          ),
          '-{2,}', '-', 'g'
        ),
        '(^-|-$)', '', 'g'
      ),
    ''),
    'subpoule'
  );
$$;

-- 3. Genereer een uniek slug uit een basis-tekst; bij botsing -2, -3, …
create or replace function public.ensure_unique_slug(p_base text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text := public.slugify(p_base);
  v_slug text := v_base;
  v_n int := 1;
begin
  while exists (select 1 from public.subpoules where lower(slug) = lower(v_slug)) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  return v_slug;
end $$;

-- 4. Backfill bestaande subpoules (per rij, oudste eerst → stabiele -2/-3).
do $$
declare r record;
begin
  for r in select id, name from public.subpoules where slug is null order by created_at, id loop
    update public.subpoules set slug = public.ensure_unique_slug(r.name) where id = r.id;
  end loop;
end $$;

alter table public.subpoules alter column slug set not null;

-- 5. create_subpoule zet nu ook een uniek slug (returnwaarde ongemoeid).
create or replace function public.create_subpoule(
  p_name text,
  p_game_id uuid,
  p_code text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_code text := coalesce(p_code, upper(substr(md5(random()::text), 1, 6)));
  v_slug text := public.ensure_unique_slug(p_name);
begin
  if v_uid is null then raise exception 'Niet ingelogd'; end if;

  insert into public.subpoules(name, game_id, code, owner_user_id, slug)
  values (p_name, p_game_id, v_code, v_uid, v_slug)
  returning id into v_id;

  insert into public.subpoule_members(subpoule_id, user_id)
  values (v_id, v_uid)
  on conflict do nothing;

  return v_id;
end $$;

grant execute on function public.create_subpoule(text, uuid, text) to authenticated;

-- 6. Resolver: slug → {id,name,code,game_id}. SECURITY DEFINER omzeilt BEWUST
--    RLS zodat een niet-lid via de link kan landen + joinen (een slug-URL is
--    feitelijk een invite-link, net als de code). Geeft alleen deze velden terug.
create or replace function public.resolve_subpoule_by_slug(p_slug text)
returns table(id uuid, name text, code text, game_id uuid)
language sql
security definer
set search_path = public
as $$
  select id, name, code, game_id
  from public.subpoules
  where lower(slug) = lower(p_slug)
  limit 1;
$$;

grant execute on function public.resolve_subpoule_by_slug(text) to authenticated;


-- ########## MIGRATIE: 20260614090000_fix_create_subpoule.sql ##########

-- ───────────────────────────────────────────────────────────────────────────
-- Fix: dubbele create_subpoule-overload → ambiguïteit bij benoemde args.
-- Er bestonden twee overloads met dezelfde benoemde parameters maar andere
-- volgorde: (uuid,text,text) en (text,uuid,text). De frontend roept met
-- benoemde args aan → PostgREST kan niet kiezen ("Could not choose the best
-- candidate function ...").
--
-- Oplossing: verwijder de overbodige overload en laat ÉÉN canonieke functie
-- (text,uuid,text) achter mét validatie ÉN slug-generatie.
--
-- VEILIG: dit raakt alleen functies (drop/replace + grant). De tabellen
-- public.subpoules / public.subpoule_members worden NIET aangeraakt — bestaande
-- subpoules (namen, leden, codes, punten, slugs) blijven volledig behouden.
-- Draait ná 20260613_subpoule_slugs.sql, dus public.ensure_unique_slug() bestaat al.
-- ───────────────────────────────────────────────────────────────────────────

-- 1) Verwijder de overbodige overload (game_id-eerst).
drop function if exists public.create_subpoule(uuid, text, text);

-- 2) Eén canonieke functie (text, uuid, text) met validatie + slug.
create or replace function public.create_subpoule(
  p_name text,
  p_game_id uuid,
  p_code text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_id   uuid;
  v_code text := coalesce(nullif(trim(p_code), ''), upper(substr(md5(random()::text), 1, 6)));
  v_slug text;
begin
  if v_uid is null then raise exception 'Niet ingelogd'; end if;
  if p_name is null or length(trim(p_name)) < 2 then raise exception 'Naam te kort'; end if;
  if length(v_code) < 4 then raise exception 'Code te kort (min 4 tekens)'; end if;
  if exists (select 1 from public.subpoules
             where game_id = p_game_id and lower(name) = lower(trim(p_name))) then
    raise exception 'Een subpoule met deze naam bestaat al';
  end if;
  if exists (select 1 from public.subpoules where code = v_code) then
    raise exception 'Deze code is al in gebruik';
  end if;

  v_slug := public.ensure_unique_slug(p_name);

  insert into public.subpoules(name, game_id, code, owner_user_id, slug)
  values (trim(p_name), p_game_id, v_code, v_uid, v_slug)
  returning id into v_id;

  insert into public.subpoule_members(subpoule_id, user_id)
  values (v_id, v_uid) on conflict do nothing;

  return v_id;
end $$;

grant execute on function public.create_subpoule(text, uuid, text) to authenticated;

-- 3) Defensieve slug-backfill (idempotent): geef eventuele slug-loze bestaande
--    subpoules alsnog een slug. Bestaande slugs worden NIET overschreven; geen
--    rij wordt verwijderd of gewijzigd buiten de lege slug-kolom.
update public.subpoules
   set slug = public.ensure_unique_slug(name)
 where slug is null;


-- ########## MIGRATIE: 20260614100000_perf_entries_indexes.sql ##########

-- ───────────────────────────────────────────────────────────────────────────
-- Performance + integriteit (hygiëne, idempotent):
--  DEEL 2: ontbrekende indexen op stages / stage_results.
--  DEEL 3: dubbele entries dedupen (alleen LEGE drafts) → unique index →
--          atomaire get_or_create_entry zodat de insert-on-read geen rollbacks
--          en geen duplicaten meer geeft.
-- VEILIG: verwijdert UITSLUITEND lege draft-duplicaten; nooit submitted entries
-- of drafts met data. Geen tabel-drops/truncates.
-- ───────────────────────────────────────────────────────────────────────────

-- ── DEEL 2: indexen ──
-- results_status staat op public.stages (filter s.results_status='approved' per
-- game), niet op stage_results. Composite index dekt die hot-path-lookup.
create index if not exists stages_game_idx on public.stages(game_id);
create index if not exists stages_game_status_idx
  on public.stages(game_id, results_status);

-- ── DEEL 3a: conservatieve dedup van entries ──
-- Per (game_id,user_id) houden we ÉÉN winnaar (submitted eerst, dan meeste data,
-- dan nieuwste). Van de rest verwijderen we ALLEEN lege drafts (status='draft'
-- én 0 picks/jokers/predictions). Het aantal verwijderde rijen wordt gelogd.
do $$
declare v_count int;
begin
  with ranked as (
    select
      e.id,
      e.status,
      row_number() over (
        partition by e.game_id, e.user_id
        order by (e.status = 'submitted') desc,
                 (coalesce(p.cnt, 0) + coalesce(j.cnt, 0) + coalesce(pr.cnt, 0)) desc,
                 e.created_at desc
      ) as rn,
      coalesce(p.cnt, 0) + coalesce(j.cnt, 0) + coalesce(pr.cnt, 0) as data_cnt
    from public.entries e
    left join (select entry_id, count(*) cnt from public.entry_picks group by entry_id) p on p.entry_id = e.id
    left join (select entry_id, count(*) cnt from public.entry_jokers group by entry_id) j on j.entry_id = e.id
    left join (select entry_id, count(*) cnt from public.entry_predictions group by entry_id) pr on pr.entry_id = e.id
  ),
  del as (
    delete from public.entries e
    using ranked r
    where e.id = r.id
      and r.rn > 1
      and r.status = 'draft'
      and r.data_cnt = 0
    returning e.id
  )
  select count(*) into v_count from del;
  raise notice 'entries-dedup: % lege draft-duplicaten verwijderd', v_count;
end $$;

-- ── DEEL 3b: unique index (één entry per game/gebruiker) ──
create unique index if not exists entries_game_user_uidx
  on public.entries(game_id, user_id);

-- ── DEEL 3c: atomaire get-or-create (geen rollback meer) ──
create or replace function public.get_or_create_entry(p_game_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then raise exception 'Niet ingelogd'; end if;

  insert into public.entries(game_id, user_id, status)
  values (p_game_id, v_uid, 'draft')
  on conflict (game_id, user_id) do nothing;

  select id into v_id
  from public.entries
  where game_id = p_game_id and user_id = v_uid;

  return v_id;
end $$;

grant execute on function public.get_or_create_entry(uuid) to authenticated;


-- ########## MIGRATIE: 20260614110000_leaderboard_mv.sql ##########

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


-- ########## MIGRATIE: 20260616120000_games_admin_write.sql ##########

-- Bug: de homepage-quote (Admin → Rubriek) bleef niet opgeslagen.
-- Oorzaak: op public.games staat RLS aan, maar er bestond alleen een SELECT-
-- policy (read_games). Zonder UPDATE-policy raakt een admin-update 0 rijen —
-- Postgres/PostgREST geeft daarbij GEEN error terug, dus de UI meldde "opgeslagen"
-- terwijl er niets werd weggeschreven. Geldt voor álle games-writes (ook thema,
-- status, datums in de Games-tab).
--
-- Fix: admins mogen games schrijven. Tevens de quote-kolommen idempotent borgen
-- voor het geval een eerdere migratie niet was uitgerold.

ALTER TABLE public.games ADD COLUMN IF NOT EXISTS homepage_quote text;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS homepage_quote_author text;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS homepage_quote_size integer;

DROP POLICY IF EXISTS games_admin_write ON public.games;
drop policy if exists games_admin_write on public.games;
CREATE POLICY games_admin_write ON public.games
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ########## MIGRATIE: 20260616200017_d182b6fd-a20a-4655-b682-096534d695ae.sql ##########

REVOKE ALL ON public.leaderboard_global_mv FROM anon, authenticated;

-- ########## CLEANUP: stale admin-sync trigger ##########
drop trigger if exists trg_sync_profile_admin on public.user_roles;
drop function if exists public.sync_profile_admin();


-- ########## FIX: admin-checks loskoppelen van gedropte profiles.is_admin ##########
-- profiles.is_admin is later gedropt (admin loopt via user_roles). Functies die
-- die kolom nog lazen/schreven gaven 42703 bij elke entry-write (via triggers).
create or replace function public.is_current_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = auth.uid() and role = 'admin');
$$;
create or replace function public.assign_admin_role(p_user_id uuid, p_make_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_make_admin then
    insert into public.user_roles(user_id, role) values (p_user_id, 'admin') on conflict do nothing;
  else
    delete from public.user_roles where user_id = p_user_id and role = 'admin';
  end if;
end $$;


-- ########## FIX: ontbrekende FK entry_predictions -> entries/riders ##########
-- entry_predictions is aangemaakt zonder FK's; PostgREST kan dan de embed
-- entry_predictions(...) niet vinden (PGRST200) -> entries-query faalt.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'entry_predictions_entry_id_fkey') then
    alter table public.entry_predictions add constraint entry_predictions_entry_id_fkey
      foreign key (entry_id) references public.entries(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'entry_predictions_rider_id_fkey') then
    alter table public.entry_predictions add constraint entry_predictions_rider_id_fkey
      foreign key (rider_id) references public.riders(id) on delete cascade;
  end if;
end $$;
notify pgrst, 'reload schema';


-- ########## FIX: save_entry_jokers race/dup-veilig ##########
create or replace function public.save_entry_jokers(p_entry_id uuid, p_rider_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_status text;
begin
  select user_id, status into v_user, v_status from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;
  if v_status = 'submitted' and not public.is_admin() then raise exception 'Entry already submitted'; end if;
  if array_length(p_rider_ids,1) > 2 then raise exception 'Maximum 2 jokers'; end if;
  delete from public.entry_jokers where entry_id = p_entry_id;
  if p_rider_ids is not null and array_length(p_rider_ids,1) > 0 then
    insert into public.entry_jokers (entry_id, rider_id)
    select distinct p_entry_id, unnest(p_rider_ids)
    on conflict (entry_id, rider_id) do nothing;
  end if;
end $$;


-- ########## GRANTS: vangnet voor reeds aangemaakte objecten ##########
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
