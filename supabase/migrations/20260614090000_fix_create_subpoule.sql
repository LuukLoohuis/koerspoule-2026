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
