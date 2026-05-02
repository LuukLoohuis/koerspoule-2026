-- Allow edits on submitted entries until game status is 'closed' or 'live'.
-- Block only when game.status IN ('closed','live').

CREATE OR REPLACE FUNCTION public.save_entry_pick(p_entry_id uuid, p_category_id uuid, p_rider_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_user uuid; v_game uuid; v_game_status text;
begin
  select user_id, game_id into v_user, v_game from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;

  select status into v_game_status from public.games where id = v_game;
  if v_game_status in ('closed','live') and not public.is_admin() then
    raise exception 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  end if;

  if not exists(select 1 from public.category_riders where category_id = p_category_id and rider_id = p_rider_id) then
    raise exception 'Rider does not belong to this category';
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
declare v_user uuid; v_game uuid; v_game_status text;
begin
  select user_id, game_id into v_user, v_game from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;

  select status into v_game_status from public.games where id = v_game;
  if v_game_status in ('closed','live') and not public.is_admin() then
    raise exception 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  end if;

  if array_length(p_rider_ids,1) > 2 then raise exception 'Maximum 2 jokers'; end if;

  delete from public.entry_jokers where entry_id = p_entry_id;
  if p_rider_ids is not null and array_length(p_rider_ids,1) > 0 then
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
BEGIN
  SELECT user_id, game_id INTO v_user, v_game FROM public.entries WHERE id = p_entry_id;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF v_user <> auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT status INTO v_game_status FROM public.games WHERE id = v_game;
  IF v_game_status IN ('closed','live') AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Wijzigen niet meer mogelijk: de koers is gesloten of live';
  END IF;

  DELETE FROM public.entry_predictions WHERE entry_id = p_entry_id;

  IF p_predictions IS NOT NULL AND jsonb_array_length(p_predictions) > 0 THEN
    FOR v_pred IN SELECT * FROM jsonb_array_elements(p_predictions) LOOP
      INSERT INTO public.entry_predictions (entry_id, classification, position, rider_id)
      VALUES (
        p_entry_id,
        v_pred->>'classification',
        (v_pred->>'position')::int,
        (v_pred->>'rider_id')::uuid
      );
    END LOOP;
  END IF;
END;
$function$;