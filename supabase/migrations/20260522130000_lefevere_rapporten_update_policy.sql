-- ============================================
-- UPDATE-policy voor lefevere_rapporten: eigen rij mogen overschrijven.
-- Nodig voor het zelf-herstel in useLefevereReport — een rij die ooit met een
-- fout cijfer is gecacht (bv. tijdens het laden) wordt opnieuw gegenereerd en
-- via upsert overschreven. Aparte migratie omdat de tabel-migratie mogelijk al
-- gedraaid is.
-- ============================================

DROP POLICY IF EXISTS lefevere_rapporten_update ON public.lefevere_rapporten;
CREATE POLICY lefevere_rapporten_update ON public.lefevere_rapporten
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()
  )
);
