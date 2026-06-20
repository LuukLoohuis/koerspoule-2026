-- Fix: enforce_entry_deadline() las NEW.status zonder eerst op tabel te checken.
-- Op entry_picks/entry_jokers heeft NEW geen `status`-veld; SQL-AND garandeert
-- geen short-circuit, dus een niet-admin die picks muteert in een gesloten game
-- kreeg `42703: record "new" has no field "status"` i.p.v. een nette melding.
-- Oplossing: de entries-specifieke tak isoleren in een eigen IF-blok.
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
  -- Vind de bijbehorende game_id (tabel-afhankelijk)
  if TG_TABLE_NAME = 'entries' then
    v_game_id := coalesce(NEW.game_id, OLD.game_id);
  elsif TG_TABLE_NAME in ('entry_picks', 'entry_jokers') then
    v_entry_id := coalesce(NEW.entry_id, OLD.entry_id);
    select game_id into v_game_id from public.entries where id = v_entry_id;
  end if;

  -- LET OP: bij een DELETE is NEW null. Een BEFORE-trigger die NEW teruggeeft
  -- ANNULEERT dan de DELETE stil → overal coalesce(NEW, OLD).
  if v_game_id is null then return coalesce(NEW, OLD); end if;

  select status into v_status from public.games where id = v_game_id;

  -- Admins mogen altijd
  if public.is_current_admin() then return coalesce(NEW, OLD); end if;

  -- Deadline-bewaking: vanaf 'locked' geen wijzigingen meer
  if v_status in ('locked', 'live', 'finished') then
    -- Uitzondering: een UPDATE op de entries-tabel die de status NIET wijzigt
    -- mag altijd door (ploegnaam/puntentelling). Deze tak ALLEEN voor entries,
    -- zodat NEW.status nooit op entry_picks/entry_jokers wordt gelezen.
    if TG_TABLE_NAME = 'entries' and TG_OP = 'UPDATE' then
      if NEW.status is not distinct from OLD.status then
        return coalesce(NEW, OLD);
      end if;
    end if;
    raise exception 'Deze game is gesloten (status %). Inzendingen kunnen niet meer worden gewijzigd.', v_status
      using errcode = '42501';
  end if;

  return coalesce(NEW, OLD);
end $$;
