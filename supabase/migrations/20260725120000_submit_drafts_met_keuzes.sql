-- Concepten (drafts) met serieuze keuzes alsnog laten meetellen: admin-actie
-- die alle draft-entries van een game met minstens p_min_picks renner-keuzes
-- op 'submitted' zet. Alle berekeningen/klassementen filteren op submitted,
-- dus dit is de enige stap die nodig is om ze mee te laten doen. Idempotent.
create or replace function public.submit_drafts_met_keuzes(p_game_id uuid, p_min_picks int default 11)
returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  with kandidaten as (
    select e.id
    from public.entries e
    where e.game_id = p_game_id
      and e.status = 'draft'
      and (select count(*) from public.entry_picks p where p.entry_id = e.id) >= p_min_picks
  )
  update public.entries e
     set status = 'submitted', submitted_at = now()
   where e.id in (select id from kandidaten);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function public.submit_drafts_met_keuzes(uuid, int) from public;
grant execute on function public.submit_drafts_met_keuzes(uuid, int) to authenticated;
