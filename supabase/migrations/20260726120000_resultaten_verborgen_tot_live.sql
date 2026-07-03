-- Resultaten-inhoud (uitslagen/punten/commentaar) verborgen voor deelnemers tot
-- de game op 'live' staat. Tijdens 'open_inschrijving' kan de admin met
-- testmodus volledig proefdraaien (fiatteren, commentaar, intrekken) zonder dat
-- deelnemers iets zien; inschrijven blijft gewoon open. Idempotent.

-- a. Commentaar: deelnemers pas vanaf live (zelfde policy als 20260722120000,
--    met open_inschrijving toegevoegd aan de verborgen statussen).
DROP POLICY IF EXISTS etappe_commentaren_select ON public.etappe_commentaren;
CREATE POLICY etappe_commentaren_select ON public.etappe_commentaren
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.stages st
        JOIN public.games g ON g.id = st.game_id
        WHERE st.id = etappe_commentaren.stage_id
          AND st.results_status = 'approved'
          AND g.status NOT IN ('open','draft','concept','open_inschrijving')
      )
      AND (
        EXISTS (SELECT 1 FROM public.subpoules s
                WHERE s.id = etappe_commentaren.subpoule_id AND s.owner_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.subpoule_members m
                   WHERE m.subpoule_id = etappe_commentaren.subpoule_id AND m.user_id = auth.uid())
      )
    )
  )
);

-- b. stage_results en stage_points: zelfde poort erbij (basis: 20260505170729).
DROP POLICY IF EXISTS read_stage_results ON public.stage_results;
CREATE POLICY read_stage_results ON public.stage_results
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.stages s
        JOIN public.games g ON g.id = s.game_id
        WHERE s.id = stage_results.stage_id
          AND s.results_status = 'approved'
          AND g.status NOT IN ('open','draft','concept','open_inschrijving')
      )
    )
  );

DROP POLICY IF EXISTS read_stage_points ON public.stage_points;
CREATE POLICY read_stage_points ON public.stage_points
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.stages s
        JOIN public.games g ON g.id = s.game_id
        WHERE s.id = stage_points.stage_id
          AND s.results_status = 'approved'
          AND g.status NOT IN ('open','draft','concept','open_inschrijving')
      )
    )
  );
