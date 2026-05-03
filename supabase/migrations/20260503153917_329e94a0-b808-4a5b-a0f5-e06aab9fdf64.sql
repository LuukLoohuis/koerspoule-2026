drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select
  to authenticated
  using (auth.uid() is not null);