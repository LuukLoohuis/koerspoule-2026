CREATE OR REPLACE FUNCTION public.mark_subpoule_read(p_subpoule_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.chat_read_states (subpoule_id, user_id, last_read_at, updated_at)
  VALUES (p_subpoule_id, auth.uid(), now(), now())
  ON CONFLICT (subpoule_id, user_id)
  DO UPDATE SET last_read_at = now(), updated_at = now();
END $$;