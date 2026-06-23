-- Premium per-subpoule feature: woonplaats opgeven bij toetreden + filteren in de
-- ranking. Standaard uit (requires_woonplaats=false); alleen aan voor specifieke
-- subpoules (bv. "Tubantia Lezerstour"). Idempotent.

alter table public.subpoules
  add column if not exists requires_woonplaats boolean not null default false;

alter table public.subpoule_members
  add column if not exists woonplaats text;

-- Toetreden mét optionele woonplaats. Bij requires_woonplaats=true is een
-- woonplaats verplicht → nette sentinel-fout zodat de client het veld toont.
drop function if exists public.join_subpoule(text);
drop function if exists public.join_subpoule(text, text);
create or replace function public.join_subpoule(p_code text, p_woonplaats text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_id uuid;
  v_requires boolean;
  v_wp text := nullif(trim(coalesce(p_woonplaats, '')), '');
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  select id, requires_woonplaats into v_id, v_requires from public.subpoules where code = trim(p_code);
  if v_id is null then raise exception 'Ongeldige code'; end if;

  if v_requires and v_wp is null then
    raise exception 'WOONPLAATS_REQUIRED' using errcode = 'P0001';
  end if;

  insert into public.subpoule_members (subpoule_id, user_id, woonplaats)
  values (v_id, auth.uid(), v_wp)
  on conflict (subpoule_id, user_id)
  do update set woonplaats = coalesce(excluded.woonplaats, public.subpoule_members.woonplaats);

  return v_id;
end $function$;

grant execute on function public.join_subpoule(text, text) to authenticated;

-- Eigen woonplaats (achteraf) zetten/bijwerken — alleen voor de eigen rij.
create or replace function public.set_my_subpoule_woonplaats(p_subpoule_id uuid, p_woonplaats text)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare v_wp text := nullif(trim(coalesce(p_woonplaats, '')), '');
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  update public.subpoule_members
     set woonplaats = v_wp
   where subpoule_id = p_subpoule_id and user_id = auth.uid();
end $function$;

grant execute on function public.set_my_subpoule_woonplaats(uuid, text) to authenticated;

-- Ledenquery uitbreiden met woonplaats (alleen leesbaar binnen de subpoule via
-- de bestaande member/admin-gate — geen lek naar buiten). Return-type wijzigt →
-- eerst droppen.
drop function if exists public.subpoule_members_with_team(uuid);
create or replace function public.subpoule_members_with_team(p_subpoule_id uuid)
returns table(user_id uuid, display_name text, team_name text, woonplaats text, joined_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select sm.user_id,
         coalesce(p.display_name, 'Onbekend') as display_name,
         e.team_name,
         sm.woonplaats,
         sm.joined_at
  from public.subpoule_members sm
  join public.subpoules s on s.id = sm.subpoule_id
  left join public.profiles p on p.id = sm.user_id
  left join public.entries e on e.user_id = sm.user_id and e.game_id = s.game_id
  where sm.subpoule_id = p_subpoule_id
    and (
      public.is_current_admin()
      or exists (
        select 1 from public.subpoule_members me
        where me.subpoule_id = p_subpoule_id and me.user_id = auth.uid()
      )
    );
$$;

grant execute on function public.subpoule_members_with_team(uuid) to authenticated;
