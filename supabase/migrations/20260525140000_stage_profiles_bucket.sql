-- ============================================
-- Storage-bucket voor geüploade etappeprofielen (admin upload in StagesTab).
-- Publiek leesbaar; alleen admins mogen schrijven/wissen.
-- ============================================

insert into storage.buckets (id, name, public)
values ('stage-profiles', 'stage-profiles', true)
on conflict (id) do nothing;

drop policy if exists "stage_profiles_read" on storage.objects;
create policy "stage_profiles_read" on storage.objects
  for select using (bucket_id = 'stage-profiles');

drop policy if exists "stage_profiles_admin_insert" on storage.objects;
create policy "stage_profiles_admin_insert" on storage.objects
  for insert with check (bucket_id = 'stage-profiles' and public.is_admin());

drop policy if exists "stage_profiles_admin_update" on storage.objects;
create policy "stage_profiles_admin_update" on storage.objects
  for update using (bucket_id = 'stage-profiles' and public.is_admin())
  with check (bucket_id = 'stage-profiles' and public.is_admin());

drop policy if exists "stage_profiles_admin_delete" on storage.objects;
create policy "stage_profiles_admin_delete" on storage.objects
  for delete using (bucket_id = 'stage-profiles' and public.is_admin());
