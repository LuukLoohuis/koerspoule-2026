
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
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_self" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_admin_all" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- user_roles
create policy "user_roles_select_self" on public.user_roles for select using (auth.uid() = user_id or public.is_admin());
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
create policy "entries_select_own_or_admin" on public.entries for select using (auth.uid() = user_id or public.is_admin());
create policy "entries_modify_own" on public.entries for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

-- entry_picks via entry ownership
create policy "entry_picks_select" on public.entry_picks for select using (
  exists(select 1 from public.entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_admin()))
);
create policy "entry_picks_modify" on public.entry_picks for all using (
  exists(select 1 from public.entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_admin()))
) with check (
  exists(select 1 from public.entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_admin()))
);

create policy "entry_jokers_select" on public.entry_jokers for select using (
  exists(select 1 from public.entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_admin()))
);
create policy "entry_jokers_modify" on public.entry_jokers for all using (
  exists(select 1 from public.entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_admin()))
) with check (
  exists(select 1 from public.entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_admin()))
);

-- subpoules: members + owner can read; owner+admin can write
create policy "subpoules_select" on public.subpoules for select using (
  owner_user_id = auth.uid()
  or public.is_admin()
  or exists(select 1 from public.subpoule_members m where m.subpoule_id = id and m.user_id = auth.uid())
);
create policy "subpoules_insert_self" on public.subpoules for insert with check (owner_user_id = auth.uid());
create policy "subpoules_update_owner" on public.subpoules for update using (owner_user_id = auth.uid() or public.is_admin());
create policy "subpoules_delete_owner" on public.subpoules for delete using (owner_user_id = auth.uid() or public.is_admin());

create policy "subpoule_members_select" on public.subpoule_members for select using (
  user_id = auth.uid() or public.is_admin()
  or exists(select 1 from public.subpoules s where s.id = subpoule_id and s.owner_user_id = auth.uid())
);
create policy "subpoule_members_insert_self" on public.subpoule_members for insert with check (user_id = auth.uid());
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
