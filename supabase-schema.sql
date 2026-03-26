create extension if not exists "pgcrypto";

create type if not exists public.game_status as enum ('draft', 'open', 'locked', 'live', 'finished');
create type if not exists public.entry_status as enum ('draft', 'submitted');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year integer not null,
  status public.game_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(year, name)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete set null,
  name text not null,
  short_name text,
  created_at timestamptz not null default now(),
  unique(game_id, name)
);

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete set null,
  name text not null,
  start_number integer,
  created_at timestamptz not null default now()
);

create unique index if not exists riders_team_start_number_idx on public.riders(team_id, start_number);
create index if not exists riders_name_idx on public.riders(name);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null,
  short_name text,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  unique(game_id, name)
);

create table if not exists public.category_riders (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(category_id, rider_id)
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.entry_status not null default 'draft',
  predictions_json jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(game_id, user_id)
);

create table if not exists public.entry_picks (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entry_id, category_id)
);

create table if not exists public.entry_jokers (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(entry_id, rider_id)
);

create table if not exists public.subpoules (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null,
  code text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.subpoule_members (
  id uuid primary key default gen_random_uuid(),
  subpoule_id uuid not null references public.subpoules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(subpoule_id, user_id)
);

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete cascade,
  stage_number integer not null,
  name text not null,
  date date,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  unique(game_id, stage_number)
);

create table if not exists public.stage_results (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  rider_id uuid references public.riders(id) on delete set null,
  start_number integer,
  rider_name text not null,
  finish_position integer not null,
  gc_position integer,
  created_at timestamptz not null default now(),
  unique(stage_id, finish_position)
);

create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid references public.stages(id) on delete cascade,
  entry_id uuid references public.entries(id) on delete cascade,
  reason text not null,
  points integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.entry_scores (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete cascade,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  unique(entry_id, stage_id)
);

create index if not exists entry_scores_entry_idx on public.entry_scores(entry_id);
create index if not exists stage_results_stage_idx on public.stage_results(stage_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or p.is_admin = true)
  );
$$;

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.categories enable row level security;
alter table public.teams enable row level security;
alter table public.riders enable row level security;
alter table public.category_riders enable row level security;
alter table public.entries enable row level security;
alter table public.entry_picks enable row level security;
alter table public.entry_jokers enable row level security;
alter table public.subpoules enable row level security;
alter table public.subpoule_members enable row level security;
alter table public.stages enable row level security;
alter table public.stage_results enable row level security;
alter table public.score_events enable row level security;
alter table public.entry_scores enable row level security;

drop policy if exists "profile read own" on public.profiles;
create policy "profile read own" on public.profiles for select using (auth.uid() = id or public.is_admin());
drop policy if exists "profile upsert own" on public.profiles;
create policy "profile upsert own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profile update own" on public.profiles;
create policy "profile update own" on public.profiles for update using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

drop policy if exists "admin games all" on public.games;
create policy "admin games all" on public.games for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "read games all auth" on public.games;
create policy "read games all auth" on public.games for select using (auth.uid() is not null);

drop policy if exists "admin categories all" on public.categories;
create policy "admin categories all" on public.categories for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "read categories auth" on public.categories;
create policy "read categories auth" on public.categories for select using (auth.uid() is not null);

drop policy if exists "admin teams all" on public.teams;
create policy "admin teams all" on public.teams for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "read teams auth" on public.teams;
create policy "read teams auth" on public.teams for select using (auth.uid() is not null);

drop policy if exists "admin riders all" on public.riders;
create policy "admin riders all" on public.riders for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "read riders auth" on public.riders;
create policy "read riders auth" on public.riders for select using (auth.uid() is not null);

drop policy if exists "admin category riders all" on public.category_riders;
create policy "admin category riders all" on public.category_riders for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "read category riders auth" on public.category_riders;
create policy "read category riders auth" on public.category_riders for select using (auth.uid() is not null);

drop policy if exists "entry own all" on public.entries;
create policy "entry own all" on public.entries for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
drop policy if exists "entry picks own all" on public.entry_picks;
create policy "entry picks own all" on public.entry_picks for all using (
  exists(select 1 from public.entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_admin()))
) with check (
  exists(select 1 from public.entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_admin()))
);
drop policy if exists "entry jokers own all" on public.entry_jokers;
create policy "entry jokers own all" on public.entry_jokers for all using (
  exists(select 1 from public.entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_admin()))
) with check (
  exists(select 1 from public.entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_admin()))
);

drop policy if exists "subpoule owner all" on public.subpoules;
create policy "subpoule owner all" on public.subpoules for all using (owner_user_id = auth.uid() or public.is_admin()) with check (owner_user_id = auth.uid() or public.is_admin());
drop policy if exists "subpoule members own all" on public.subpoule_members;
create policy "subpoule members own all" on public.subpoule_members for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "subpoule read auth" on public.subpoules;
create policy "subpoule read auth" on public.subpoules for select using (auth.uid() is not null);
drop policy if exists "subpoule members read auth" on public.subpoule_members;
create policy "subpoule members read auth" on public.subpoule_members for select using (auth.uid() is not null);

drop policy if exists "admin stages all" on public.stages;
create policy "admin stages all" on public.stages for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "read stages auth" on public.stages;
create policy "read stages auth" on public.stages for select using (auth.uid() is not null);

drop policy if exists "admin stage results all" on public.stage_results;
create policy "admin stage results all" on public.stage_results for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "read stage results auth" on public.stage_results;
create policy "read stage results auth" on public.stage_results for select using (auth.uid() is not null);

drop policy if exists "read entry scores auth" on public.entry_scores;
create policy "read entry scores auth" on public.entry_scores for select using (auth.uid() is not null);
drop policy if exists "admin entry scores write" on public.entry_scores;
create policy "admin entry scores write" on public.entry_scores for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "read score events auth" on public.score_events;
create policy "read score events auth" on public.score_events for select using (auth.uid() is not null);
drop policy if exists "admin score events write" on public.score_events;
create policy "admin score events write" on public.score_events for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.save_entry_pick(p_entry_id uuid, p_category_id uuid, p_rider_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from public.entries where id = p_entry_id;
  if v_user_id is null then
    raise exception 'Entry not found';
  end if;
  if v_user_id <> auth.uid() and not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  insert into public.entry_picks(entry_id, category_id, rider_id)
  values (p_entry_id, p_category_id, p_rider_id)
  on conflict (entry_id, category_id)
  do update set rider_id = excluded.rider_id, updated_at = now();
end;
$$;

create or replace function public.save_entry_jokers(p_entry_id uuid, p_rider_ids uuid[])
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_overlap_count int;
begin
  if array_length(p_rider_ids, 1) <> 2 then
    raise exception 'Exactly two jokers required';
  end if;
  if p_rider_ids[1] = p_rider_ids[2] then
    raise exception 'Jokers must be unique';
  end if;

  select user_id into v_user_id from public.entries where id = p_entry_id;
  if v_user_id is null then
    raise exception 'Entry not found';
  end if;
  if v_user_id <> auth.uid() and not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  select count(*) into v_overlap_count
  from public.entry_picks ep
  where ep.entry_id = p_entry_id and ep.rider_id = any(p_rider_ids);

  if v_overlap_count > 0 then
    raise exception 'Jokers overlap with category picks';
  end if;

  delete from public.entry_jokers where entry_id = p_entry_id;
  insert into public.entry_jokers(entry_id, rider_id)
  select p_entry_id, unnest(p_rider_ids);
end;
$$;

create or replace function public.submit_entry(p_entry_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_game_id uuid;
  v_category_count int;
  v_pick_count int;
  v_joker_count int;
begin
  select user_id, game_id into v_user_id, v_game_id from public.entries where id = p_entry_id;
  if v_user_id is null then
    raise exception 'Entry not found';
  end if;
  if v_user_id <> auth.uid() and not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  select count(*) into v_category_count from public.categories where game_id = v_game_id;
  select count(*) into v_pick_count from public.entry_picks where entry_id = p_entry_id;
  select count(*) into v_joker_count from public.entry_jokers where entry_id = p_entry_id;

  if v_pick_count <> v_category_count then
    raise exception 'Complete all categories before submitting';
  end if;
  if v_joker_count <> 2 then
    raise exception 'Choose exactly two jokers';
  end if;

  update public.entries
  set status = 'submitted', submitted_at = now(), updated_at = now()
  where id = p_entry_id;
end;
$$;

create or replace function public.calculate_stage_scores(stage_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Placeholder hook for full scoring logic.
  -- This function can be expanded to process top20 points + predictions.
  insert into public.score_events(stage_id, reason, points, payload)
  values (stage_id, 'calculate_stage_scores_called', 0, '{}'::jsonb);
end;
$$;
