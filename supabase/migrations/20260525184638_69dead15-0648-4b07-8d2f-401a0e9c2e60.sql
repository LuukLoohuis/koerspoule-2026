
INSERT INTO storage.buckets (id, name, public)
VALUES ('stage-profiles', 'stage-profiles', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Stage profiles are publicly accessible" ON storage.objects;
CREATE POLICY "Stage profiles are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'stage-profiles');

DROP POLICY IF EXISTS "Admins can upload stage profiles" ON storage.objects;
CREATE POLICY "Admins can upload stage profiles"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'stage-profiles' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update stage profiles" ON storage.objects;
CREATE POLICY "Admins can update stage profiles"
ON storage.objects FOR UPDATE
USING (bucket_id = 'stage-profiles' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete stage profiles" ON storage.objects;
CREATE POLICY "Admins can delete stage profiles"
ON storage.objects FOR DELETE
USING (bucket_id = 'stage-profiles' AND public.is_admin());
