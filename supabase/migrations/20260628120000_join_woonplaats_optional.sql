-- Woonplaats optioneel bij toetreden. requires_woonplaats blijft het veld in de
-- join-flow onthullen (eerste poging zonder woonplaats raise't WOONPLAATS_REQUIRED),
-- maar met p_allow_empty=true mag je vervolgens leeg (null) toetreden. Idempotent.
-- Oude 2-arg-signatuur droppen → geen overload-ambiguïteit voor PostgREST.
drop function if exists public.join_subpoule(text, text);

create or replace function public.join_subpoule(
  p_code text,
  p_woonplaats text default null,
  p_allow_empty boolean default false
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_requires boolean;
  v_wp text := nullif(trim(coalesce(p_woonplaats, '')), '');
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  select id, requires_woonplaats into v_id, v_requires from public.subpoules where code = trim(p_code);
  if v_id is null then raise exception 'Ongeldige code'; end if;

  -- Onthul het (optionele) woonplaats-veld in de UI: eerste poging zonder
  -- woonplaats signaleert WOONPLAATS_REQUIRED; daarna mag de gebruiker leeg door.
  if v_requires and v_wp is null and not p_allow_empty then
    raise exception 'WOONPLAATS_REQUIRED' using errcode = 'P0001';
  end if;

  insert into public.subpoule_members (subpoule_id, user_id, woonplaats)
  values (v_id, auth.uid(), v_wp)
  on conflict (subpoule_id, user_id)
  do update set woonplaats = coalesce(excluded.woonplaats, public.subpoule_members.woonplaats);

  return v_id;
end $function$;

grant execute on function public.join_subpoule(text, text, boolean) to authenticated;
