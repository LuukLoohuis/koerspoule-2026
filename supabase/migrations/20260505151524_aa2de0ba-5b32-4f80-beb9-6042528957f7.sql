
CREATE OR REPLACE FUNCTION public.admin_delete_user_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'Je kunt jezelf niet verwijderen'; END IF;

  DELETE FROM public.entry_picks WHERE entry_id IN (SELECT id FROM public.entries WHERE user_id = p_user_id);
  DELETE FROM public.entry_jokers WHERE entry_id IN (SELECT id FROM public.entries WHERE user_id = p_user_id);
  DELETE FROM public.entry_predictions WHERE entry_id IN (SELECT id FROM public.entries WHERE user_id = p_user_id);
  DELETE FROM public.entry_prediction_points WHERE entry_id IN (SELECT id FROM public.entries WHERE user_id = p_user_id);
  DELETE FROM public.stage_points WHERE entry_id IN (SELECT id FROM public.entries WHERE user_id = p_user_id);
  DELETE FROM public.total_points WHERE entry_id IN (SELECT id FROM public.entries WHERE user_id = p_user_id);
  DELETE FROM public.entries WHERE user_id = p_user_id;

  DELETE FROM public.chat_messages WHERE user_id = p_user_id;
  DELETE FROM public.subpoule_members WHERE user_id = p_user_id;
  -- subpoules waar deze user owner is: cleanup members + chat + subpoule
  DELETE FROM public.subpoule_members WHERE subpoule_id IN (SELECT id FROM public.subpoules WHERE owner_user_id = p_user_id);
  DELETE FROM public.chat_messages WHERE subpoule_id IN (SELECT id FROM public.subpoules WHERE owner_user_id = p_user_id);
  DELETE FROM public.subpoules WHERE owner_user_id = p_user_id;

  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_entry(p_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.entry_picks WHERE entry_id = p_entry_id;
  DELETE FROM public.entry_jokers WHERE entry_id = p_entry_id;
  DELETE FROM public.entry_predictions WHERE entry_id = p_entry_id;
  DELETE FROM public.entry_prediction_points WHERE entry_id = p_entry_id;
  DELETE FROM public.stage_points WHERE entry_id = p_entry_id;
  DELETE FROM public.total_points WHERE entry_id = p_entry_id;
  DELETE FROM public.entries WHERE id = p_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_entry_status(p_entry_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_status NOT IN ('draft','submitted') THEN RAISE EXCEPTION 'Ongeldige status'; END IF;
  UPDATE public.entries
     SET status = p_status,
         submitted_at = CASE WHEN p_status = 'submitted' THEN COALESCE(submitted_at, now()) ELSE NULL END
   WHERE id = p_entry_id;
END;
$$;
