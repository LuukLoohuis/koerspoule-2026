-- Hard search_path lock (defense-in-depth; al gezet maar idempotent)
alter function public.is_admin() set search_path = public, pg_temp;
alter function public.game_entries_standings(uuid) set search_path = public, pg_temp;
alter function public.game_standings(uuid, integer) set search_path = public, pg_temp;

-- Sluit PUBLIC af, herbevestig grants
revoke all on function public.is_admin() from public;
revoke all on function public.game_entries_standings(uuid) from public;
revoke all on function public.game_standings(uuid, integer) from public;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.game_entries_standings(uuid) to anon, authenticated;
grant execute on function public.game_standings(uuid, integer) to anon, authenticated;