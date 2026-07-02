-- Radio Koerspoule (Ome Gerrit) volledig verwijderd; schone-lei-intrek en de
-- commentaar-gate blijven. De neutrale "De Voorbeschouwing"-sectie blijft bestaan.

-- 1) Radio Koerspoule (Ome Gerrit) volledig weg.
DROP TABLE IF EXISTS public.etappe_voorbeschouwingen CASCADE;
ALTER TABLE public.games DROP COLUMN IF EXISTS radio_koerspoule_enabled;
-- games.admin_testmodus NIET aanraken, die blijft.

-- 2) revoke_stage_approval: schone lei = punten + commentaar. Geen voorbeschouwing meer.
CREATE OR REPLACE FUNCTION public.revoke_stage_approval(p_stage_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_game uuid;
  v_actor_name text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT game_id INTO v_game FROM public.stages WHERE id = p_stage_id;
  UPDATE public.stages
     SET results_status = 'pending', approved_by = NULL, approved_at = NULL
   WHERE id = p_stage_id;
  DELETE FROM public.stage_points       WHERE stage_id = p_stage_id;
  DELETE FROM public.etappe_commentaren WHERE stage_id = p_stage_id;
  IF v_game IS NOT NULL THEN
    PERFORM public.update_total_ranking(v_game);
  END IF;
  SELECT display_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.results_approval_log(stage_id, action, actor_user_id, actor_display_name)
    VALUES (p_stage_id, 'revoked', auth.uid(), v_actor_name);
END $$;

-- 3) etappe_commentaren SELECT-policy: deelnemer ziet commentaar alleen bij approved
--    EN game niet in preview. Admin bypass. Membership behouden.
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
          AND g.status NOT IN ('open','draft','concept')
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
