-- Twee ongebruikte/kapotte recalc-functies repareren (landmijnen). Idempotent.

-- 1) recalc_prepare: de OUT-kolom heet 'stage_id' en botst met
--    stage_points.stage_id in de DELETE → kolom kwalificeren.
create or replace function public.recalc_prepare(p_game_id uuid)
returns table(stage_id uuid)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;

  delete from public.stage_points sp
  where sp.stage_id in (select id from public.stages where game_id = p_game_id);

  delete from public.entry_prediction_points epp
  where epp.entry_id in (select id from public.entries where game_id = p_game_id);

  return query
    select s.id from public.stages s
    where s.game_id = p_game_id and s.results_status = 'approved'
    order by s.stage_number;
end $function$;

-- 2) calculate_stage_points_v4 was niet alleen syntactisch kapot (text = enum),
--    maar ook inhoudelijk afwijkend van de LIVE scorelogica: het telde álle
--    klassementen (gc/kom/points/youth) en miste het status='submitted'-filter,
--    wat verkeerde standen geeft. De canonieke, gebruikte functie is
--    calculate_stage_scores (stage-only, alleen ingediende ploegen, joker x mult).
--    v4 (nog aangeroepen door de Berekening-tab) delegeert daar nu naar, zodat
--    beide paden identiek én correct zijn.
create or replace function public.calculate_stage_points_v4(p_stage_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.calculate_stage_scores(p_stage_id);
end $function$;
