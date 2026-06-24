-- Eigenaarschap van een subpoule overdragen aan een ander lid. Idempotent.
-- Server-side afgedwongen: alleen huidige eigenaar; nieuwe eigenaar moet lid zijn;
-- niet al eigenaar. Oude eigenaar blijft lid.
create or replace function public.transfer_subpoule_ownership(p_subpoule_id uuid, p_new_owner uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_owner uuid;
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;

  select owner_user_id into v_owner from public.subpoules where id = p_subpoule_id;
  if v_owner is null then raise exception 'Subpoule niet gevonden'; end if;
  if v_owner <> auth.uid() then raise exception 'Alleen de eigenaar mag overdragen'; end if;
  if p_new_owner = v_owner then raise exception 'Deze persoon is al eigenaar'; end if;

  if not exists (
    select 1 from public.subpoule_members
    where subpoule_id = p_subpoule_id and user_id = p_new_owner
  ) then
    raise exception 'Nieuwe eigenaar moet lid zijn van de subpoule';
  end if;

  update public.subpoules set owner_user_id = p_new_owner where id = p_subpoule_id;
end $function$;

revoke all on function public.transfer_subpoule_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_subpoule_ownership(uuid, uuid) to authenticated;
