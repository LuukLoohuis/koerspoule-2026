-- ============================================
-- DELETE-policy voor lefevere_rapporten: admin mag cache wissen.
-- Nodig voor de admin-knop "Regenereer Lefevère" in Fiatteren: door de
-- gecachte rapporten te verwijderen, genereert elke deelnemer bij de volgende
-- weergave een vers rapport (nu via het nieuwe model / verbeterde prompt).
-- ============================================

DROP POLICY IF EXISTS lefevere_rapporten_delete_admin ON public.lefevere_rapporten;
CREATE POLICY lefevere_rapporten_delete_admin ON public.lefevere_rapporten
FOR DELETE USING (public.is_admin());
