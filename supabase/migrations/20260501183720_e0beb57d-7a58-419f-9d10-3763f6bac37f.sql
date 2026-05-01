-- Bugfix: subpoules_select policy referenced m.id instead of subpoules.id
DROP POLICY IF EXISTS subpoules_select ON public.subpoules;
CREATE POLICY subpoules_select ON public.subpoules
FOR SELECT USING (
  (owner_user_id = auth.uid())
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.subpoule_members m
    WHERE m.subpoule_id = subpoules.id AND m.user_id = auth.uid()
  )
);

-- Ensure unique name per game
CREATE UNIQUE INDEX IF NOT EXISTS subpoules_game_name_unique ON public.subpoules(game_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS subpoules_code_unique ON public.subpoules(code);

-- create_subpoule RPC
CREATE OR REPLACE FUNCTION public.create_subpoule(
  p_game_id uuid,
  p_name text,
  p_code text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  IF p_name IS NULL OR length(trim(p_name)) < 2 THEN RAISE EXCEPTION 'Naam te kort'; END IF;
  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN RAISE EXCEPTION 'Code te kort (min 4 tekens)'; END IF;

  IF EXISTS (SELECT 1 FROM public.subpoules WHERE game_id = p_game_id AND lower(name) = lower(trim(p_name))) THEN
    RAISE EXCEPTION 'Een subpoule met deze naam bestaat al';
  END IF;
  IF EXISTS (SELECT 1 FROM public.subpoules WHERE code = trim(p_code)) THEN
    RAISE EXCEPTION 'Deze code is al in gebruik';
  END IF;

  INSERT INTO public.subpoules (game_id, owner_user_id, name, code)
  VALUES (p_game_id, auth.uid(), trim(p_name), trim(p_code))
  RETURNING id INTO v_id;

  INSERT INTO public.subpoule_members (subpoule_id, user_id) VALUES (v_id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END $$;

-- join_subpoule RPC
CREATE OR REPLACE FUNCTION public.join_subpoule(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  SELECT id INTO v_id FROM public.subpoules WHERE code = trim(p_code);
  IF v_id IS NULL THEN RAISE EXCEPTION 'Ongeldige code'; END IF;

  INSERT INTO public.subpoule_members (subpoule_id, user_id) VALUES (v_id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END $$;

-- leave_subpoule RPC
CREATE OR REPLACE FUNCTION public.leave_subpoule(p_subpoule_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  SELECT owner_user_id INTO v_owner FROM public.subpoules WHERE id = p_subpoule_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Subpoule niet gevonden'; END IF;
  IF v_owner = auth.uid() THEN
    RAISE EXCEPTION 'Eigenaar kan subpoule niet verlaten — verwijder de subpoule of draag eigenaarschap over';
  END IF;
  DELETE FROM public.subpoule_members WHERE subpoule_id = p_subpoule_id AND user_id = auth.uid();
END $$;

-- remove_subpoule_member RPC (owner only)
CREATE OR REPLACE FUNCTION public.remove_subpoule_member(p_subpoule_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  SELECT owner_user_id INTO v_owner FROM public.subpoules WHERE id = p_subpoule_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Subpoule niet gevonden'; END IF;
  IF v_owner <> auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'Alleen eigenaar mag leden verwijderen'; END IF;
  IF p_user_id = v_owner THEN RAISE EXCEPTION 'Eigenaar kan niet verwijderd worden'; END IF;
  DELETE FROM public.subpoule_members WHERE subpoule_id = p_subpoule_id AND user_id = p_user_id;
END $$;

-- delete_subpoule RPC
CREATE OR REPLACE FUNCTION public.delete_subpoule(p_subpoule_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  SELECT owner_user_id INTO v_owner FROM public.subpoules WHERE id = p_subpoule_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Subpoule niet gevonden'; END IF;
  IF v_owner <> auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'Alleen eigenaar mag verwijderen'; END IF;
  DELETE FROM public.subpoule_members WHERE subpoule_id = p_subpoule_id;
  DELETE FROM public.chat_messages WHERE subpoule_id = p_subpoule_id;
  DELETE FROM public.subpoules WHERE id = p_subpoule_id;
END $$;