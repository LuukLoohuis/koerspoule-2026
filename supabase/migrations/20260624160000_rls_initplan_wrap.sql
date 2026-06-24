-- RLS-perf (security-rls-performance): wrap auth.uid()/is_admin()/is_current_admin()
-- in een scalar-subquery zodat Postgres ze ÉÉN keer evalueert (InitPlan) i.p.v.
-- per rij. Alleen de zwaarste leeslijsten. Logica identiek → zelfde zichtbaarheid.
-- ALTER POLICY wijzigt enkel de USING-expressie (geen moment zonder policy).

alter policy subpoule_members_select on public.subpoule_members
  using (
    (user_id = (select auth.uid()))
    or (select public.is_admin())
    or public.is_subpoule_member(subpoule_id, (select auth.uid()))
    or (exists (select 1 from public.subpoules s
                 where s.id = subpoule_members.subpoule_id and s.owner_user_id = (select auth.uid())))
  );

alter policy entries_select on public.entries
  using (((select auth.uid()) = user_id) or (select public.is_current_admin()));

alter policy entries_select_own_or_admin on public.entries
  using (((select auth.uid()) = user_id) or (select public.is_admin()));

alter policy read_total_points on public.total_points
  using ((select auth.uid()) is not null);

alter policy profiles_select_authenticated on public.profiles
  using ((select auth.uid()) is not null);

alter policy read_stage_points on public.stage_points
  using (
    ((select auth.uid()) is not null)
    and ((select public.is_admin())
         or (exists (select 1 from public.stages s
                      where s.id = stage_points.stage_id and s.results_status = 'approved')))
  );

alter policy read_stage_results on public.stage_results
  using (
    ((select auth.uid()) is not null)
    and ((select public.is_admin())
         or (exists (select 1 from public.stages s
                      where s.id = stage_results.stage_id and s.results_status = 'approved')))
  );
