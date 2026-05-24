
-- 1. rubriek_votes: require authentication to read
DROP POLICY IF EXISTS rubriek_votes_read ON public.rubriek_votes;
CREATE POLICY rubriek_votes_read ON public.rubriek_votes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. profiles: prevent privilege escalation in policy (defence in depth — trigger also enforces)
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid())
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 3. realtime.messages: require authenticated session to subscribe to any topic
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'realtime' AND tablename = 'messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages';
    EXECUTE $p$CREATE POLICY "Authenticated users can receive broadcasts" ON realtime.messages
      FOR SELECT TO authenticated USING (true)$p$;
  END IF;
END $$;

-- 4. Fix mutable search_path on email queue helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
