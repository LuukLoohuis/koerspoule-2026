#!/usr/bin/env python3
"""Bouwt supabase/_full_setup.sql voor een schone Supabase.

Basis = 20260430193546 (compleet backend-schema, nieuw model), daarna een compat-
blok (oud user_teams/team_picks-model dat admin_v3 nog nodig heeft), dan alle
overige migraties chronologisch. Uitgesloten: schema.sql (conflicteert) en 4
pg_cron e-mail-queue jobs (oude edge-function/secret).

Per-file fixes voor inconsistente tussenstand-migraties tegen de definitieve basis:
- backend_v4 : stage_points/total_points heetten daar team_id -> entry_id.
- admin_v3   : game_type kolom als enum -> text (definitieve model = text).
- alle views : 'create or replace view X' krijgt 'drop view if exists X cascade'
               ervoor (kolomwijzigingen mogen niet met create-or-replace).
"""
import glob, os, re

MIG = "supabase/migrations"
BASE = f"{MIG}/20260430193546_04ef20c4-2ea8-47fd-82b4-c91b214f8812.sql"
BACKEND_V4 = "20260202_backend_v4.sql"
ADMIN_V3 = "20260201_admin_v3.sql"
EXCLUDE = {
    os.path.basename(BASE),
    "20260531180000_email_queue_cron_slower.sql",
    "20260601120000_cron_logs_cleanup.sql",
    "20260602195820_491160e8-6f8a-4346-9e78-ca24a40caf57.sql",
    "20260611161124_a2ef300d-26e9-4718-8d95-f9c2abcd3100.sql",
}

COMPAT = """
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
"""

view_re = re.compile(r'create\s+or\s+replace\s+view\s+(public\.\w+)', re.IGNORECASE)


def transform(s, name):
    if name == BACKEND_V4:
        s = s.replace("team_id", "entry_id")  # geen user_teams/team_picks hier -> alles is entry-id
    if name == ADMIN_V3:
        s = s.replace("game_type public.game_type", "game_type text")  # enum -> text (definitief model)
    # views: drop vóór (her)definitie zodat kolomwijzigingen toegestaan zijn
    s = view_re.sub(lambda m: f'drop view if exists {m.group(1)} cascade;\ncreate or replace view {m.group(1)}', s)
    return s


def read(path):
    return transform(open(path).read(), os.path.basename(path))


def main():
    parts = [
        "-- KOERSPOULE — VOLLEDIGE DB-OPZET (schone Supabase)\n"
        "-- Gegenereerd door supabase/build_setup.py.\n"
        "-- Basis 20260430193546 + compat + overige migraties (chronologisch).\n"
        "-- Uit: schema.sql + 4 cron-jobs. Fixes: backend_v4 team_id->entry_id,\n"
        "-- admin_v3 game_type->text, views drop+recreate.\n",
        "-- ########## BASIS ##########\n",
        read(BASE),
        COMPAT,
    ]
    for f in sorted(glob.glob(f"{MIG}/*.sql")):
        if os.path.basename(f) in EXCLUDE:
            continue
        parts.append(f"\n-- ########## MIGRATIE: {os.path.basename(f)} ##########\n")
        parts.append(read(f))
    open("supabase/_full_setup.sql", "w").write("\n".join(parts))
    print("geschreven: supabase/_full_setup.sql")


if __name__ == "__main__":
    main()
