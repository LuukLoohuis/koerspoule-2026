-- Clean up stale/cross-race picks before tightening validation.
DELETE FROM public.entry_picks ep
USING public.entries e, public.categories c, public.riders r
LEFT JOIN public.teams t ON t.id = r.team_id
WHERE ep.entry_id = e.id
  AND ep.category_id = c.id
  AND ep.rider_id = r.id
  AND (
    c.game_id <> e.game_id
    OR COALESCE(t.game_id, e.game_id) <> e.game_id
    OR NOT EXISTS (
      SELECT 1
      FROM public.category_riders cr
      WHERE cr.category_id = ep.category_id
        AND cr.rider_id = ep.rider_id
    )
  );

DELETE FROM public.entry_jokers ej
USING public.entries e, public.riders r
LEFT JOIN public.teams t ON t.id = r.team_id
WHERE ej.entry_id = e.id
  AND ej.rider_id = r.id
  AND (
    t.id IS NULL
    OR t.game_id <> e.game_id
    OR EXISTS (
      SELECT 1
      FROM public.entry_picks ep
      WHERE ep.entry_id = ej.entry_id
        AND ep.rider_id = ej.rider_id
    )
  );

DELETE FROM public.entry_predictions pr
USING public.entries e, public.riders r
LEFT JOIN public.teams t ON t.id = r.team_id
WHERE pr.entry_id = e.id
  AND pr.rider_id = r.id
  AND (
    t.id IS NULL
    OR t.game_id <> e.game_id
  );

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

  if not exists (
    select 1
    from public.category_riders cr
    join public.riders r on r.id = cr.rider_id
    join public.teams t on t.id = r.team_id
    where cr.category_id = p_category_id
      and cr.rider_id = p_rider_id
      and t.game_id = v_game
  ) then
    raise exception 'Deze renner hoort niet in deze Giro 2026-categorie. Kies een renner uit deze kaart.';
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

  if not exists (
    select 1
    from public.category_riders cr
    join public.riders r on r.id = cr.rider_id
    join public.teams t on t.id = r.team_id
    where cr.category_id = p_category_id
      and cr.rider_id = p_rider_id
      and t.game_id = v_game
  ) then
    raise exception 'Deze renner hoort niet in deze categorie.';
  end if;

  if exists(select 1 from public.entry_jokers where entry_id = p_entry_id and rider_id = p_rider_id) then
    raise exception 'Deze renner is al gekozen als joker. Verwijder de joker eerst.';
  end if;

  delete from public.entry_picks where entry_id = p_entry_id and category_id = p_category_id;
  insert into public.entry_picks (entry_id, category_id, rider_id) values (p_entry_id, p_category_id, p_rider_id);
end $function$;

CREATE OR REPLACE FUNCTION public.save_entry_jokers(p_entry_id uuid, p_rider_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid;
  v_game uuid;
  v_game_status text;
  v_distinct_count int;
begin
  select user_id, game_id into v_user, v_game from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;

  select status into v_game_status from public.games where id = v_game;
  if v_game_status in ('closed','live','locked','finished') and not public.is_admin() then
    raise exception 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  end if;

  if array_length(p_rider_ids, 1) > 2 then raise exception 'Maximum 2 jokers'; end if;

  select count(distinct x.rider_id) into v_distinct_count
  from unnest(coalesce(p_rider_ids, array[]::uuid[])) as x(rider_id);

  if v_distinct_count <> coalesce(array_length(p_rider_ids, 1), 0) then
    raise exception 'Jokers moeten uniek zijn';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_rider_ids, array[]::uuid[])) as x(rider_id)
    left join public.riders r on r.id = x.rider_id
    left join public.teams t on t.id = r.team_id
    where t.id is null or t.game_id <> v_game
  ) then
    raise exception 'Een joker moet uit de startlijst van deze koers komen.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_rider_ids, array[]::uuid[])) as x(rider_id)
    join public.entry_picks ep on ep.entry_id = p_entry_id and ep.rider_id = x.rider_id
  ) then
    raise exception 'Een joker mag niet al in je categorieploeg zitten.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_rider_ids, array[]::uuid[])) as x(rider_id)
    join public.category_riders cr on cr.rider_id = x.rider_id
    join public.categories c on c.id = cr.category_id and c.game_id = v_game
  ) then
    raise exception 'Jokers komen uit de overige renners, niet uit een categorie.';
  end if;

  delete from public.entry_jokers where entry_id = p_entry_id;
  if p_rider_ids is not null and array_length(p_rider_ids, 1) > 0 then
    insert into public.entry_jokers (entry_id, rider_id)
    select p_entry_id, unnest(p_rider_ids);
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.save_entry_predictions(p_entry_id uuid, p_predictions jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_game uuid;
  v_game_status text;
  v_pred jsonb;
  v_rider uuid;
BEGIN
  SELECT user_id, game_id INTO v_user, v_game FROM public.entries WHERE id = p_entry_id;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF v_user <> auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT status INTO v_game_status FROM public.games WHERE id = v_game;
  IF v_game_status IN ('closed','live','locked','finished') AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  END IF;

  DELETE FROM public.entry_predictions WHERE entry_id = p_entry_id;

  IF p_predictions IS NOT NULL AND jsonb_array_length(p_predictions) > 0 THEN
    FOR v_pred IN SELECT * FROM jsonb_array_elements(p_predictions) LOOP
      v_rider := (v_pred->>'rider_id')::uuid;

      IF NOT EXISTS (
        SELECT 1
        FROM public.riders r
        JOIN public.teams t ON t.id = r.team_id
        WHERE r.id = v_rider
          AND t.game_id = v_game
      ) THEN
        RAISE EXCEPTION 'Een voorspelde renner hoort niet bij deze koers.';
      END IF;

      INSERT INTO public.entry_predictions (entry_id, classification, position, rider_id)
      VALUES (
        p_entry_id,
        v_pred->>'classification',
        (v_pred->>'position')::int,
        v_rider
      );
    END LOOP;
  END IF;
END;
$function$;