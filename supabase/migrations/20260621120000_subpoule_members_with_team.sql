-- Leden van een subpoule met hun display_name én teamnaam in deze game.
-- entries.team_name is via RLS alleen eigen/admin leesbaar, dus een SECURITY
-- DEFINER-RPC. Gate: caller moet lid van de subpoule zijn (of admin). Geeft
-- UITSLUITEND display_name + team_name (+ joined_at) terug — geen e-mail/privé.
create or replace function public.subpoule_members_with_team(p_subpoule_id uuid)
returns table(user_id uuid, display_name text, team_name text, joined_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select sm.user_id,
         coalesce(p.display_name, 'Onbekend') as display_name,
         e.team_name,
         sm.joined_at
  from public.subpoule_members sm
  join public.subpoules s on s.id = sm.subpoule_id
  left join public.profiles p on p.id = sm.user_id
  left join public.entries e on e.user_id = sm.user_id and e.game_id = s.game_id
  where sm.subpoule_id = p_subpoule_id
    and (
      public.is_current_admin()
      or exists (
        select 1 from public.subpoule_members me
        where me.subpoule_id = p_subpoule_id and me.user_id = auth.uid()
      )
    );
$$;

grant execute on function public.subpoule_members_with_team(uuid) to authenticated;
