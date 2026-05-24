DROP POLICY IF EXISTS lefevere_rapporten_delete_admin ON public.lefevere_rapporten;
CREATE POLICY lefevere_rapporten_delete_admin ON public.lefevere_rapporten
FOR DELETE USING (public.is_admin());