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
  insert into public.stage_points(stage_id, team_id, points)
  select p_stage_id, entry_id, points from entry_points
  on conflict (stage_id, team_id) do update set points = excluded.points;
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

  insert into public.total_points(team_id, total_points, updated_at)
  select e.id,
         coalesce(sum(sp.points), 0)::int,
         now()
  from public.entries e
  left join public.stage_points sp on sp.team_id = e.id
  left join public.stages s on s.id = sp.stage_id and s.game_id = p_game_id
  where e.game_id = p_game_id
  group by e.id
  on conflict (team_id)
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
left join public.total_points tp on tp.team_id = e.id
left join public.profiles p on p.id = e.user_id;

grant select on public.leaderboard_global to authenticated;

-- Subpoule klassement
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
left join public.total_points tp on tp.team_id = e.id
left join public.profiles p on p.id = e.user_id;

grant select on public.leaderboard_subpoule to authenticated;

-- ============================================================
-- 6. RLS REFINEMENTS
-- ============================================================

-- Entries: speler ziet eigen + admin alles
alter table public.entries enable row level security;

drop policy if exists "entries_select" on public.entries;
create policy "entries_select" on public.entries
  for select using (auth.uid() = user_id or public.is_current_admin());

drop policy if exists "entries_modify" on public.entries;
create policy "entries_modify" on public.entries
  for all using (auth.uid() = user_id or public.is_current_admin())
  with check (auth.uid() = user_id or public.is_current_admin());

-- Entry_picks via entry-ownership
alter table public.entry_picks enable row level security;

drop policy if exists "entry_picks_select" on public.entry_picks;
create policy "entry_picks_select" on public.entry_picks
  for select using (
    exists(select 1 from public.entries e where e.id = entry_id
           and (e.user_id = auth.uid() or public.is_current_admin()))
  );

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
create policy "entry_jokers_select" on public.entry_jokers
  for select using (
    exists(select 1 from public.entries e where e.id = entry_id
           and (e.user_id = auth.uid() or public.is_current_admin()))
  );

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
create policy "subpoules_select" on public.subpoules
  for select using (
    public.is_current_admin()
    or owner_user_id = auth.uid()
    or exists(select 1 from public.subpoule_members m
              where m.subpoule_id = id and m.user_id = auth.uid())
  );

drop policy if exists "subpoules_owner_modify" on public.subpoules;
create policy "subpoules_owner_modify" on public.subpoules
  for all using (owner_user_id = auth.uid() or public.is_current_admin())
  with check (owner_user_id = auth.uid() or public.is_current_admin());

-- Subpoule_members: lid ziet eigen lijst, eigenaar/admin alles
alter table public.subpoule_members enable row level security;

drop policy if exists "subpoule_members_select" on public.subpoule_members;
create policy "subpoule_members_select" on public.subpoule_members
  for select using (
    user_id = auth.uid()
    or public.is_current_admin()
    or exists(select 1 from public.subpoules sp where sp.id = subpoule_id and sp.owner_user_id = auth.uid())
    or exists(select 1 from public.subpoule_members sm where sm.subpoule_id = subpoule_id and sm.user_id = auth.uid())
  );

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
create policy "notification_log_self_select" on public.notification_log
  for select using (auth.uid() = user_id or public.is_current_admin());

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
left join public.total_points tp on tp.team_id = e.id;

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
