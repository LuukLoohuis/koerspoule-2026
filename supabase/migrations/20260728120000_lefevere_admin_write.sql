-- Admin mag Lefevère-rapporten voor ALLE inzendingen schrijven (nodig voor de
-- client-driven batch-generatie vanuit het Fiatteren-tabje). De bestaande
-- eigenaar-toegang (lazy per-deelnemer-generatie) blijft behouden. Geen schema-
-- wijziging — alleen de INSERT/UPDATE-policies uitbreiden met public.is_admin().
-- Idempotent.

DROP POLICY IF EXISTS lefevere_rapporten_insert ON public.lefevere_rapporten;
CREATE POLICY lefevere_rapporten_insert ON public.lefevere_rapporten
FOR INSERT WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS lefevere_rapporten_update ON public.lefevere_rapporten;
CREATE POLICY lefevere_rapporten_update ON public.lefevere_rapporten
FOR UPDATE USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()
  )
) WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = lefevere_rapporten.entry_id AND e.user_id = auth.uid()
  )
);

-- force-modus in de batch wist eerst de rijen voor de huidige stand → admin
-- DELETE toestaan (bestond nog niet; eigenaar heeft geen delete nodig).
DROP POLICY IF EXISTS lefevere_rapporten_admin_delete ON public.lefevere_rapporten;
CREATE POLICY lefevere_rapporten_admin_delete ON public.lefevere_rapporten
FOR DELETE USING (public.is_admin());
