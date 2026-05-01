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