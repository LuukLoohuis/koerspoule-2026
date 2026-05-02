REVOKE ALL ON FUNCTION public.game_entries_standings(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.subpoule_entries_detail(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.game_entries_standings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.subpoule_entries_detail(uuid, uuid) TO authenticated;