
-- 1. Status & audit columns on stages
ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS results_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_for_approval_at timestamptz;

ALTER TABLE public.stages
  DROP CONSTRAINT IF EXISTS stages_results_status_check;
ALTER TABLE public.stages
  ADD CONSTRAINT stages_results_status_check
  CHECK (results_status IN ('draft','pending','approved'));

-- Auto-mark stages that already have any results as 'approved' (preserve current visibility)
UPDATE public.stages s
SET results_status = 'approved',
    approved_at = COALESCE(approved_at, now())
WHERE results_status = 'draft'
  AND EXISTS (SELECT 1 FROM public.stage_results sr WHERE sr.stage_id = s.id);

-- 2. Audit log table
CREATE TABLE IF NOT EXISTS public.results_approval_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('submitted','approved','revoked','reverted_to_draft')),
  actor_user_id uuid,
  actor_display_name text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_results_approval_log_stage ON public.results_approval_log(stage_id, created_at DESC);

ALTER TABLE public.results_approval_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "approval_log_admin_all" ON public.results_approval_log;
CREATE POLICY "approval_log_admin_all" ON public.results_approval_log
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. RLS gating: non-admin can only see results/points for approved stages
DROP POLICY IF EXISTS read_stage_results ON public.stage_results;
CREATE POLICY read_stage_results ON public.stage_results
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.stages s
        WHERE s.id = stage_results.stage_id AND s.results_status = 'approved'
      )
    )
  );

DROP POLICY IF EXISTS read_stage_points ON public.stage_points;
CREATE POLICY read_stage_points ON public.stage_points
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.stages s
        WHERE s.id = stage_points.stage_id AND s.results_status = 'approved'
      )
    )
  );

-- 4. RPCs
CREATE OR REPLACE FUNCTION public.submit_stage_for_approval(p_stage_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor_name text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stage_results WHERE stage_id = p_stage_id) THEN
    RAISE EXCEPTION 'Geen uitslag ingevuld voor deze etappe';
  END IF;
  UPDATE public.stages
     SET results_status = 'pending',
         submitted_for_approval_at = now()
   WHERE id = p_stage_id;
  SELECT display_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.results_approval_log(stage_id, action, actor_user_id, actor_display_name)
    VALUES (p_stage_id, 'submitted', auth.uid(), v_actor_name);
END $$;

CREATE OR REPLACE FUNCTION public.approve_stage_results(p_stage_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_game uuid;
  v_actor_name text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT game_id INTO v_game FROM public.stages WHERE id = p_stage_id;
  IF v_game IS NULL THEN RAISE EXCEPTION 'Stage not found'; END IF;

  UPDATE public.stages
     SET results_status = 'approved',
         approved_by = auth.uid(),
         approved_at = now()
   WHERE id = p_stage_id;

  PERFORM public.calculate_stage_scores(p_stage_id);
  PERFORM public.calculate_prediction_points(v_game);
  PERFORM public.update_total_ranking(v_game);

  SELECT display_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.results_approval_log(stage_id, action, actor_user_id, actor_display_name)
    VALUES (p_stage_id, 'approved', auth.uid(), v_actor_name);
END $$;

CREATE OR REPLACE FUNCTION public.revoke_stage_approval(p_stage_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_game uuid;
  v_actor_name text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT game_id INTO v_game FROM public.stages WHERE id = p_stage_id;
  UPDATE public.stages
     SET results_status = 'pending',
         approved_by = NULL,
         approved_at = NULL
   WHERE id = p_stage_id;
  -- Wis stagepunten zodat totalen niet meer meetellen
  DELETE FROM public.stage_points WHERE stage_id = p_stage_id;
  IF v_game IS NOT NULL THEN
    PERFORM public.update_total_ranking(v_game);
  END IF;
  SELECT display_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.results_approval_log(stage_id, action, actor_user_id, actor_display_name)
    VALUES (p_stage_id, 'revoked', auth.uid(), v_actor_name);
END $$;

CREATE OR REPLACE FUNCTION public.revert_stage_to_draft(p_stage_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor_name text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.stages SET results_status = 'draft', submitted_for_approval_at = NULL
   WHERE id = p_stage_id AND results_status = 'pending';
  SELECT display_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.results_approval_log(stage_id, action, actor_user_id, actor_display_name)
    VALUES (p_stage_id, 'reverted_to_draft', auth.uid(), v_actor_name);
END $$;

-- 5. Update full_recalculation to only include approved stages
CREATE OR REPLACE FUNCTION public.full_recalculation(p_game_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_stage uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  DELETE FROM public.stage_points
  WHERE stage_id IN (SELECT id FROM public.stages WHERE game_id = p_game_id);

  DELETE FROM public.entry_prediction_points
  WHERE entry_id IN (SELECT id FROM public.entries WHERE game_id = p_game_id);

  FOR v_stage IN
    SELECT id FROM public.stages
    WHERE game_id = p_game_id AND results_status = 'approved'
  LOOP
    PERFORM public.calculate_stage_scores(v_stage);
  END LOOP;

  PERFORM public.calculate_prediction_points(p_game_id);
  PERFORM public.update_total_ranking(p_game_id);
END $$;

-- 6. Admin overview RPC for pending stages
CREATE OR REPLACE FUNCTION public.admin_pending_approvals(p_game_id uuid)
RETURNS TABLE(
  stage_id uuid,
  stage_number int,
  stage_name text,
  stage_date date,
  results_status text,
  submitted_for_approval_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  approved_by_name text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.stage_number, s.name, s.date, s.results_status,
         s.submitted_for_approval_at, s.approved_by, s.approved_at,
         p.display_name
  FROM public.stages s
  LEFT JOIN public.profiles p ON p.id = s.approved_by
  WHERE public.is_admin()
    AND s.game_id = p_game_id
    AND s.results_status IN ('pending','draft','approved')
  ORDER BY
    CASE s.results_status WHEN 'pending' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
    s.stage_number;
$$;
