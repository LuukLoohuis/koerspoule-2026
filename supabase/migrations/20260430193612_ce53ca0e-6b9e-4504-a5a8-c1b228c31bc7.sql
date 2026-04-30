
-- Lock down SECURITY DEFINER functions: only authenticated users may execute
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.handle_new_user() from public, anon;
revoke execute on function public.save_entry_pick(uuid, uuid, uuid) from public, anon;
revoke execute on function public.save_entry_jokers(uuid, uuid[]) from public, anon;
revoke execute on function public.submit_entry(uuid) from public, anon;
revoke execute on function public.assign_admin_role(uuid, boolean) from public, anon;
revoke execute on function public.seed_default_points_schema(uuid) from public, anon;
revoke execute on function public.calculate_stage_scores(uuid) from public, anon;
revoke execute on function public.update_total_ranking(uuid) from public, anon;
revoke execute on function public.full_recalculation(uuid) from public, anon;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.save_entry_pick(uuid, uuid, uuid) to authenticated;
grant execute on function public.save_entry_jokers(uuid, uuid[]) to authenticated;
grant execute on function public.submit_entry(uuid) to authenticated;
grant execute on function public.assign_admin_role(uuid, boolean) to authenticated;
grant execute on function public.seed_default_points_schema(uuid) to authenticated;
grant execute on function public.calculate_stage_scores(uuid) to authenticated;
grant execute on function public.update_total_ranking(uuid) to authenticated;
grant execute on function public.full_recalculation(uuid) to authenticated;

-- Fix mutable search_path on trigger function
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
