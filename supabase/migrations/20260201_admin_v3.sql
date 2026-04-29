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
  add column if not exists game_type public.game_type,
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
create policy "read_classification_results" on public.classification_results
  for select using (auth.uid() is not null);

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
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

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
