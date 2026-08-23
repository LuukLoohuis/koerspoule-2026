-- Een renner zonder ploegrij kon niet gekozen worden, en de melding zei
-- "hoort niet in deze categorie" -- terwijl hij daar wel in staat. Dat stuurt
-- je naar de verkeerde oorzaak; het duurde een onderzoek voor duidelijk was dat
-- het om ontbrekende ploegdata ging.
--
-- Beide pick-functies krijgen er een controle vóór die zegt wat er echt aan de
-- hand is. De bestaande controle blijft ongewijzigd: een renner zonder ploeg
-- MAG nog steeds niet gekozen worden -- de jokerfunctie weigert hem ook -- maar
-- je weet nu waarom.
--
-- Meteen ook de hardgecodeerde koersnaam "Giro 2026" uit de melding van
-- toggle_entry_pick. Functies zijn verder letterlijk overgenomen uit
-- 20260504193948.

CREATE OR REPLACE FUNCTION public.toggle_entry_pick(p_entry_id uuid, p_category_id uuid, p_rider_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid;
  v_game uuid;
  v_game_status text;
  v_max int;
  v_current int;
  v_exists boolean;
  v_other_cat_name text;
  v_rider_name text;
begin
  select user_id, game_id into v_user, v_game from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;

  select status into v_game_status from public.games where id = v_game;
  if v_game_status in ('closed','live','locked','finished') and not public.is_admin() then
    raise exception 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  end if;

  select coalesce(max_picks, 1) into v_max
  from public.categories
  where id = p_category_id
    and game_id = v_game;

  if v_max is null then
    raise exception 'Deze categorie hoort niet bij deze koers. Vernieuw de pagina en probeer opnieuw.';
  end if;

  -- Een renner zonder ploegrij valt buiten de join hieronder en kreeg dan
  -- "hoort niet in deze categorie" -- terwijl hij er wel degelijk in staat.
  -- Die melding stuurt je de verkeerde kant op; dit zegt wat er echt is.
  if exists (
    select 1
    from public.category_riders cr
    join public.riders r on r.id = cr.rider_id
    left join public.teams t on t.id = r.team_id
    where cr.category_id = p_category_id
      and cr.rider_id = p_rider_id
      and t.id is null
  ) then
    raise exception 'Deze renner heeft nog geen ploeg in de startlijst en kan daardoor niet gekozen worden. Meld dit bij de organisatie.';
  end if;

  if not exists (
    select 1
    from public.category_riders cr
    join public.riders r on r.id = cr.rider_id
    join public.teams t on t.id = r.team_id
    where cr.category_id = p_category_id
      and cr.rider_id = p_rider_id
      and t.game_id = v_game
  ) then
    raise exception 'Deze renner hoort niet in deze categorie. Kies een renner uit deze kaart.';
  end if;

  select exists(
    select 1 from public.entry_picks
    where entry_id = p_entry_id and category_id = p_category_id and rider_id = p_rider_id
  ) into v_exists;

  if v_exists then
    delete from public.entry_picks
    where entry_id = p_entry_id and category_id = p_category_id and rider_id = p_rider_id;
    return;
  end if;

  select c.name into v_other_cat_name
  from public.entry_picks ep
  join public.categories c on c.id = ep.category_id
  where ep.entry_id = p_entry_id
    and ep.rider_id = p_rider_id
    and ep.category_id <> p_category_id
  limit 1;

  if v_other_cat_name is not null then
    select name into v_rider_name from public.riders where id = p_rider_id;
    raise exception 'Deze renner (%) zit al in categorie "%". Verwijder hem daar eerst.', coalesce(v_rider_name, 'onbekend'), v_other_cat_name;
  end if;

  if exists(select 1 from public.entry_jokers where entry_id = p_entry_id and rider_id = p_rider_id) then
    select name into v_rider_name from public.riders where id = p_rider_id;
    raise exception 'Deze renner (%) is al gekozen als joker. Verwijder de joker eerst.', coalesce(v_rider_name, 'onbekend');
  end if;

  select count(*) into v_current
  from public.entry_picks
  where entry_id = p_entry_id and category_id = p_category_id;

  if v_current >= v_max then
    if v_max = 1 then
      delete from public.entry_picks where entry_id = p_entry_id and category_id = p_category_id;
    else
      raise exception 'Deze categorie is al compleet (%/%). Verwijder eerst een renner uit dit waaiergroepje.', v_current, v_max;
    end if;
  end if;

  insert into public.entry_picks (entry_id, category_id, rider_id)
  values (p_entry_id, p_category_id, p_rider_id);
end $function$;

CREATE OR REPLACE FUNCTION public.save_entry_pick(p_entry_id uuid, p_category_id uuid, p_rider_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid;
  v_game uuid;
  v_game_status text;
begin
  select user_id, game_id into v_user, v_game from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;

  select status into v_game_status from public.games where id = v_game;
  if v_game_status in ('closed','live','locked','finished') and not public.is_admin() then
    raise exception 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  end if;

  if not exists(select 1 from public.categories where id = p_category_id and game_id = v_game) then
    raise exception 'Deze categorie hoort niet bij deze koers. Vernieuw de pagina en probeer opnieuw.';
  end if;

  -- Een renner zonder ploegrij valt buiten de join hieronder en kreeg dan
  -- "hoort niet in deze categorie" -- terwijl hij er wel degelijk in staat.
  -- Die melding stuurt je de verkeerde kant op; dit zegt wat er echt is.
  if exists (
    select 1
    from public.category_riders cr
    join public.riders r on r.id = cr.rider_id
    left join public.teams t on t.id = r.team_id
    where cr.category_id = p_category_id
      and cr.rider_id = p_rider_id
      and t.id is null
  ) then
    raise exception 'Deze renner heeft nog geen ploeg in de startlijst en kan daardoor niet gekozen worden. Meld dit bij de organisatie.';
  end if;

  if not exists (
    select 1
    from public.category_riders cr
    join public.riders r on r.id = cr.rider_id
    join public.teams t on t.id = r.team_id
    where cr.category_id = p_category_id
      and cr.rider_id = p_rider_id
      and t.game_id = v_game
  ) then
    raise exception 'Deze renner hoort niet in deze categorie. Kies een renner uit deze kaart.';
  end if;

  if exists(select 1 from public.entry_jokers where entry_id = p_entry_id and rider_id = p_rider_id) then
    raise exception 'Deze renner is al gekozen als joker. Verwijder de joker eerst.';
  end if;

  delete from public.entry_picks where entry_id = p_entry_id and category_id = p_category_id;
  insert into public.entry_picks (entry_id, category_id, rider_id) values (p_entry_id, p_category_id, p_rider_id);
end $function$;

NOTIFY pgrst, 'reload schema';
