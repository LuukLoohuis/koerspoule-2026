-- Read policy (anon + authenticated) op private team-jerseys bucket
DROP POLICY IF EXISTS "team_jerseys_read" ON storage.objects;
CREATE POLICY "team_jerseys_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'team-jerseys');

-- Zorg dat is_admin() callable is vanuit RLS
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "team_jerseys_admin_insert" ON storage.objects;
CREATE POLICY "team_jerseys_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team-jerseys' AND public.is_admin());

DROP POLICY IF EXISTS "team_jerseys_admin_update" ON storage.objects;
CREATE POLICY "team_jerseys_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'team-jerseys' AND public.is_admin())
  WITH CHECK (bucket_id = 'team-jerseys' AND public.is_admin());

DROP POLICY IF EXISTS "team_jerseys_admin_delete" ON storage.objects;
CREATE POLICY "team_jerseys_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'team-jerseys' AND public.is_admin());