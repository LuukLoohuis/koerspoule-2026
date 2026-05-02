-- Helper: bypass RLS om lidmaatschap te checken
CREATE OR REPLACE FUNCTION public.is_subpoule_member(_subpoule_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subpoule_members
    WHERE subpoule_id = _subpoule_id AND user_id = _user_id
  );
$$;

-- subpoules: SELECT policy via helper
DROP POLICY IF EXISTS subpoules_select ON public.subpoules;
CREATE POLICY subpoules_select ON public.subpoules
FOR SELECT
USING (
  owner_user_id = auth.uid()
  OR public.is_admin()
  OR public.is_subpoule_member(id, auth.uid())
);

-- subpoule_members: SELECT policy zodat leden elkaar zien
DROP POLICY IF EXISTS subpoule_members_select ON public.subpoule_members;
CREATE POLICY subpoule_members_select ON public.subpoule_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_admin()
  OR public.is_subpoule_member(subpoule_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.subpoules s
    WHERE s.id = subpoule_members.subpoule_id AND s.owner_user_id = auth.uid()
  )
);