-- Run this in Supabase SQL editor.
-- This creates a minimal profile/admin setup and secure policies
-- for the admin dashboard flow.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Users can upsert own profile" on public.profiles;
create policy "Users can upsert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Expected table shape for stage results used by the admin page.
-- Adjust if your project already has these tables.
create table if not exists public.stage_results (
  id bigint generated always as identity primary key,
  stage_id uuid not null references public.stages(id) on delete cascade,
  rider_name text not null,
  finish_position integer not null,
  gc_position integer,
  created_at timestamptz not null default now()
);

alter table public.stage_results enable row level security;

drop policy if exists "Public read stage results" on public.stage_results;
create policy "Public read stage results"
  on public.stage_results
  for select
  using (true);

drop policy if exists "Admin manages stage results" on public.stage_results;
create policy "Admin manages stage results"
  on public.stage_results
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
