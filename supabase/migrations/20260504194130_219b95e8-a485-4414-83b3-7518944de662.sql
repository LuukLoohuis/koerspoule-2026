REVOKE EXECUTE ON FUNCTION public.toggle_entry_pick(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_entry_pick(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_entry_jokers(uuid, uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_entry_predictions(uuid, jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.toggle_entry_pick(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_entry_pick(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_entry_jokers(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_entry_predictions(uuid, jsonb) TO authenticated;