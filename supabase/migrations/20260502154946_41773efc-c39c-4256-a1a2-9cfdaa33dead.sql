-- Toggle pick: voegt rider toe of verwijdert hem; respecteert categories.max_picks
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
begin
  select user_id, game_id into v_user, v_game from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;

  select status into v_game_status from public.games where id = v_game;
  if v_game_status in ('closed','live','locked','finished') and not public.is_admin() then
    raise exception 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  end if;

  if not exists(select 1 from public.category_riders where category_id = p_category_id and rider_id = p_rider_id) then
    raise exception 'Rider does not belong to this category';
  end if;

  select coalesce(max_picks, 1) into v_max from public.categories where id = p_category_id;

  select exists(
    select 1 from public.entry_picks
    where entry_id = p_entry_id and category_id = p_category_id and rider_id = p_rider_id
  ) into v_exists;

  if v_exists then
    delete from public.entry_picks
    where entry_id = p_entry_id and category_id = p_category_id and rider_id = p_rider_id;
    return;
  end if;

  select count(*) into v_current
  from public.entry_picks
  where entry_id = p_entry_id and category_id = p_category_id;

  if v_current >= v_max then
    -- Bij 1 keuze: vervang automatisch (oude gedrag). Bij meer: weiger.
    if v_max = 1 then
      delete from public.entry_picks where entry_id = p_entry_id and category_id = p_category_id;
    else
      raise exception 'Maximaal % keuzes voor deze categorie bereikt', v_max;
    end if;
  end if;

  insert into public.entry_picks (entry_id, category_id, rider_id)
  values (p_entry_id, p_category_id, p_rider_id);
end $function$;