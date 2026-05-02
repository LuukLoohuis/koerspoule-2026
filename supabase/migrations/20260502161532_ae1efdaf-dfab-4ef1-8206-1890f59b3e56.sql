CREATE OR REPLACE FUNCTION public.submit_entry(p_entry_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_user uuid; v_game uuid; v_missing int;
begin
  select user_id, game_id into v_user, v_game from public.entries where id = p_entry_id;
  if v_user is null then raise exception 'Entry not found'; end if;
  if v_user <> auth.uid() and not public.is_admin() then raise exception 'Not authorized'; end if;

  select count(*) into v_missing
  from public.categories c
  where c.game_id = v_game
    and not exists (
      select 1 from public.entry_picks ep
      where ep.entry_id = p_entry_id and ep.category_id = c.id
    );

  if v_missing > 0 then
    raise exception 'Niet alle categorieën zijn ingevuld (% nog leeg)', v_missing;
  end if;

  update public.entries set status = 'submitted', submitted_at = now() where id = p_entry_id;
end $function$;