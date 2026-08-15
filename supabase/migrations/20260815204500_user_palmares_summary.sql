-- Compact palmares payload for the signed-in user.
-- Replaces one full benchmark payload per game/subpoule with one aggregated RPC.

create or replace function public.user_palmares_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_summary jsonb;
begin
  if v_user_id is null then
    raise exception 'Niet ingelogd';
  end if;

  with
  my_entries as (
    select
      e.id as entry_id,
      e.game_id,
      e.total_points,
      g.name as game_name,
      g.game_type,
      g.year,
      g.status
    from public.entries e
    join public.games g on g.id = e.game_id
    where e.user_id = v_user_id
      and e.status = 'submitted'
  ),
  relevant_entries as (
    select e.id as entry_id, e.user_id, e.game_id, e.total_points
    from public.entries e
    where e.status = 'submitted'
      and e.game_id in (select me.game_id from my_entries me)
  ),
  global_ranked as (
    select
      re.*,
      rank() over (partition by re.game_id order by coalesce(re.total_points, 0) desc)::int as my_rank,
      count(*) over (partition by re.game_id)::int as total_participants
    from relevant_entries re
  ),
  approved_stages as (
    select s.id, s.game_id, s.stage_number, s.name, s.date
    from public.stages s
    where s.game_id in (select me.game_id from my_entries me)
      and s.results_status = 'approved'
      and exists (select 1 from public.stage_results sr where sr.stage_id = s.id)
  ),
  global_stage_ranked as (
    select
      ast.game_id,
      ast.id as stage_id,
      ast.stage_number,
      ast.name as stage_name,
      ast.date,
      sp.entry_id,
      sp.points,
      rank() over (partition by sp.stage_id order by sp.points desc)::int as stage_rank
    from approved_stages ast
    join public.stage_points sp on sp.stage_id = ast.id
    join relevant_entries re on re.entry_id = sp.entry_id and re.game_id = ast.game_id
  ),
  my_game_stage_summary as (
    select
      me.entry_id,
      count(*) filter (where gsr.stage_rank = 1 and gsr.points > 0)::int as stage_wins,
      count(*) filter (where gsr.stage_rank <= 3 and gsr.points > 0)::int as stage_podiums,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'stage_id', gsr.stage_id,
            'stage_number', gsr.stage_number,
            'stage_name', gsr.stage_name,
            'date', gsr.date,
            'points', gsr.points
          ) order by gsr.stage_number
        ) filter (where gsr.stage_rank = 1 and gsr.points > 0),
        '[]'::jsonb
      ) as dagzeges
    from my_entries me
    left join global_stage_ranked gsr on gsr.entry_id = me.entry_id
    group by me.entry_id
  ),
  game_stage_counts as (
    select ast.game_id, count(*)::int as stages_count
    from approved_stages ast
    group by ast.game_id
  ),
  game_rows as (
    select
      me.*,
      gr.my_rank,
      gr.total_participants,
      coalesce(mgss.stage_wins, 0) as stage_wins,
      coalesce(mgss.stage_podiums, 0) as stage_podiums,
      coalesce(gsc.stages_count, 0) as stages_count,
      coalesce(mgss.dagzeges, '[]'::jsonb) as dagzeges
    from my_entries me
    join global_ranked gr on gr.entry_id = me.entry_id
    left join my_game_stage_summary mgss on mgss.entry_id = me.entry_id
    left join game_stage_counts gsc on gsc.game_id = me.game_id
  ),
  my_memberships as (
    select sp.id as subpoule_id, sp.name as subpoule_name, sp.game_id
    from public.subpoule_members sm
    join public.subpoules sp on sp.id = sm.subpoule_id
    where sm.user_id = v_user_id
      and sp.game_id in (select me.game_id from my_entries me)
  ),
  subpoule_entries as (
    select
      mm.subpoule_id,
      mm.game_id,
      e.id as entry_id,
      e.user_id,
      e.total_points
    from my_memberships mm
    join public.subpoule_members sm on sm.subpoule_id = mm.subpoule_id
    join public.entries e
      on e.user_id = sm.user_id
     and e.game_id = mm.game_id
     and e.status = 'submitted'
  ),
  subpoule_ranked as (
    select
      se.*,
      rank() over (partition by se.subpoule_id order by coalesce(se.total_points, 0) desc)::int as my_rank,
      count(*) over (partition by se.subpoule_id)::int as total_members
    from subpoule_entries se
  ),
  subpoule_stage_ranked as (
    select
      se.subpoule_id,
      se.user_id,
      sp.entry_id,
      sp.stage_id,
      sp.points,
      rank() over (partition by se.subpoule_id, sp.stage_id order by sp.points desc)::int as stage_rank
    from subpoule_entries se
    join public.stage_points sp on sp.entry_id = se.entry_id
    join approved_stages ast on ast.id = sp.stage_id and ast.game_id = se.game_id
  ),
  my_subpoule_stage_summary as (
    select
      ssr.subpoule_id,
      count(*) filter (where ssr.stage_rank = 1 and ssr.points > 0)::int as stage_wins,
      count(*) filter (where ssr.stage_rank <= 3 and ssr.points > 0)::int as stage_podiums
    from subpoule_stage_ranked ssr
    where ssr.user_id = v_user_id
    group by ssr.subpoule_id
  ),
  subpoule_rows as (
    select
      mm.subpoule_id,
      mm.subpoule_name,
      mm.game_id,
      me.game_name,
      me.game_type,
      sr.my_rank,
      sr.total_members,
      (sr.my_rank = 1) as is_winner,
      coalesce(msps.stage_wins, 0) as stage_wins,
      coalesce(msps.stage_podiums, 0) as stage_podiums
    from my_memberships mm
    join my_entries me on me.game_id = mm.game_id
    join subpoule_ranked sr
      on sr.subpoule_id = mm.subpoule_id
     and sr.user_id = v_user_id
    left join my_subpoule_stage_summary msps on msps.subpoule_id = mm.subpoule_id
  )
  select jsonb_build_object(
    'games', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'game_id', gr.game_id,
          'game_name', gr.game_name,
          'game_type', gr.game_type,
          'year', gr.year,
          'status', gr.status,
          'entry_id', gr.entry_id,
          'approved_points', coalesce(gr.total_points, 0),
          'my_rank', gr.my_rank,
          'total_participants', gr.total_participants,
          'stage_wins', gr.stage_wins,
          'stage_podiums', gr.stage_podiums,
          'stages_count', gr.stages_count,
          'dagzeges', gr.dagzeges
        ) order by gr.year desc nulls last, gr.game_name
      )
      from game_rows gr
    ), '[]'::jsonb),
    'subpoules', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'subpoule_id', sr.subpoule_id,
          'subpoule_name', sr.subpoule_name,
          'game_id', sr.game_id,
          'game_name', sr.game_name,
          'game_type', sr.game_type,
          'my_rank', sr.my_rank,
          'total_members', sr.total_members,
          'is_winner', sr.is_winner,
          'stage_wins', sr.stage_wins,
          'stage_podiums', sr.stage_podiums
        ) order by sr.subpoule_name
      )
      from subpoule_rows sr
    ), '[]'::jsonb)
  ) into v_summary;

  return v_summary;
end;
$$;

revoke all on function public.user_palmares_summary() from public;
revoke execute on function public.user_palmares_summary() from anon;
grant execute on function public.user_palmares_summary() to authenticated, service_role;

comment on function public.user_palmares_summary() is
  'Returns one compact, server-aggregated palmares payload for auth.uid().';
