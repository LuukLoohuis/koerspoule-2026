-- Server-side cleanup (edge functions met de service-role key, bv.
-- admin-delete-user) draait zonder JWT, dus is_current_admin() is daar false.
-- Daardoor blokkeerde enforce_entry_deadline de entry_picks-cascade bij het
-- verwijderen van een deelnemer in een gesloten game (locked/live/finished),
-- wat de verwijderknop liet falen met een non-2xx. De service-role key is nooit
-- client-side beschikbaar, dus deze context altijd doorlaten is veilig.
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
  -- Vertrouwde server-context (service-role) mag altijd — voor admin-cleanup.
  if auth.role() = 'service_role' then return coalesce(NEW, OLD); end if;

  -- Vind de bijbehorende game_id (tabel-afhankelijk)
  if TG_TABLE_NAME = 'entries' then
    v_game_id := coalesce(NEW.game_id, OLD.game_id);
  elsif TG_TABLE_NAME in ('entry_picks', 'entry_jokers') then
    v_entry_id := coalesce(NEW.entry_id, OLD.entry_id);
    select game_id into v_game_id from public.entries where id = v_entry_id;
  end if;

  -- LET OP: bij een DELETE is NEW null → overal coalesce(NEW, OLD).
  if v_game_id is null then return coalesce(NEW, OLD); end if;

  select status into v_status from public.games where id = v_game_id;

  -- Admins mogen altijd
  if public.is_current_admin() then return coalesce(NEW, OLD); end if;

  -- Deadline-bewaking: vanaf 'locked' geen wijzigingen meer
  if v_status in ('locked', 'live', 'finished') then
    -- Uitzondering: een UPDATE op de entries-tabel die de status NIET wijzigt
    -- mag altijd door. Deze tak ALLEEN voor entries, zodat NEW.status nooit op
    -- entry_picks/entry_jokers wordt gelezen (anders 42703-crash).
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
