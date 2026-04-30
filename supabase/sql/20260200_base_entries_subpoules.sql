-- =====================================================================
-- Base tables required by 20260202_backend_v4.sql
-- Run this BEFORE 20260202_backend_v4.sql in Supabase SQL Editor
-- =====================================================================

-- ENTRIES (één per user per game)
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','submitted')),
  total_points int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id)
);
create index if not exists entries_game_idx on public.entries(game_id);
create index if not exists entries_user_idx on public.entries(user_id);

-- ENTRY PICKS
create table if not exists public.entry_picks (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (entry_id, rider_id)
);
create index if not exists entry_picks_entry_idx on public.entry_picks(entry_id);
create index if not exists entry_picks_category_idx on public.entry_picks(category_id);
create index if not exists entry_picks_rider_idx on public.entry_picks(rider_id);

-- ENTRY JOKERS
create table if not exists public.entry_jokers (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (entry_id, rider_id)
);
create index if not exists entry_jokers_entry_idx on public.entry_jokers(entry_id);
create index if not exists entry_jokers_rider_idx on public.entry_jokers(rider_id);

-- SUBPOULES
create table if not exists public.subpoules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  game_id uuid not null references public.games(id) on delete cascade,
  code text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (game_id, name)
);
create index if not exists subpoules_game_idx on public.subpoules(game_id);
create index if not exists subpoules_owner_idx on public.subpoules(owner_user_id);

-- SUBPOULE MEMBERS
create table if not exists public.subpoule_members (
  id uuid primary key default gen_random_uuid(),
  subpoule_id uuid not null references public.subpoules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (subpoule_id, user_id)
);
create index if not exists subpoule_members_subpoule_idx on public.subpoule_members(subpoule_id);
create index if not exists subpoule_members_user_idx on public.subpoule_members(user_id);

-- updated_at trigger voor entries
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_entries_updated_at on public.entries;
create trigger trg_entries_updated_at
  before update on public.entries
  for each row execute function public.tg_set_updated_at();
