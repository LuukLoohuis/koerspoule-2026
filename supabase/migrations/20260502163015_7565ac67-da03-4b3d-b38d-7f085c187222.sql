REVOKE EXECUTE ON FUNCTION public.game_entries_standings(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.subpoule_entries_detail(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.game_entries_standings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.subpoule_entries_detail(uuid, uuid) TO authenticated;