-- Eigen storage-bucket voor ploeg-truien (kit-afbeeldingen). Eerder werd de
-- stage-profiles-bucket hergebruikt, maar de upload gaf "new row violates
-- row-level security policy" — de hand-genaamde storage-policies van die bucket
-- zijn kennelijk niet (volledig) toegepast. Hier een schone, expliciete set
-- policies in een aparte bucket, zodat admin-upload betrouwbaar werkt.
--
-- Publiek leesbaar (truien tonen in de app). Schrijven alleen voor ingelogde
-- admins (public.is_admin() = has_role(uid,'admin') via user_roles, dezelfde
-- bron als de admin-gate van de app).

INSERT INTO storage.buckets (id, name, public)
VALUES ('team-jerseys', 'team-jerseys', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Zorg dat de admin-check aanroepbaar is vanuit de RLS-policies.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "team_jerseys_read" ON storage.objects;
CREATE POLICY "team_jerseys_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'team-jerseys');

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
