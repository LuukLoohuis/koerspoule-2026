-- ── Foto bij een rubriek-item ────────────────────────────────────────────────
--
-- Zelfde patroon als sponsor-assets en prize-assets: een publieke bucket met
-- leesrecht voor iedereen en schrijfrecht alleen voor admins. De url komt in
-- rubriek_items te staan, zodat de krant er geen tweede query voor nodig heeft.

ALTER TABLE public.rubriek_items
  ADD COLUMN IF NOT EXISTS foto_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('rubriek-assets', 'rubriek-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS rubriek_assets_read ON storage.objects;
CREATE POLICY rubriek_assets_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'rubriek-assets');

DROP POLICY IF EXISTS rubriek_assets_admin_insert ON storage.objects;
CREATE POLICY rubriek_assets_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rubriek-assets' AND (SELECT public.is_admin()));

DROP POLICY IF EXISTS rubriek_assets_admin_update ON storage.objects;
CREATE POLICY rubriek_assets_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'rubriek-assets' AND (SELECT public.is_admin()))
  WITH CHECK (bucket_id = 'rubriek-assets' AND (SELECT public.is_admin()));

DROP POLICY IF EXISTS rubriek_assets_admin_delete ON storage.objects;
CREATE POLICY rubriek_assets_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'rubriek-assets' AND (SELECT public.is_admin()));
