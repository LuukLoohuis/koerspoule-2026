-- ============================================
-- 1. STAGES: stage_type kolom
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'stage_type_enum'
  ) THEN
    CREATE TYPE public.stage_type_enum AS ENUM (
      'vlak', 'heuvelachtig', 'tijdrit', 'bergop', 'ploegentijdrit'
    );
  END IF;
END$$;

ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS stage_type public.stage_type_enum NOT NULL DEFAULT 'vlak';

-- ============================================
-- 2. CHAT MESSAGES tabel
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     uuid NOT NULL,
  subpoule_id uuid NULL,                    -- NULL = algemene peloton-chat
  user_id     uuid NOT NULL,
  body        text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_game_subpoule_created_idx
  ON public.chat_messages (game_id, subpoule_id, created_at DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: peloton-chat zichtbaar voor iedereen die is ingelogd;
--         subpoule-chat alleen voor leden, eigenaar of admin
DROP POLICY IF EXISTS chat_messages_select ON public.chat_messages;
CREATE POLICY chat_messages_select ON public.chat_messages
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    subpoule_id IS NULL
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.subpoules s
      WHERE s.id = chat_messages.subpoule_id
        AND s.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.subpoule_members m
      WHERE m.subpoule_id = chat_messages.subpoule_id
        AND m.user_id = auth.uid()
    )
  )
);

-- INSERT: alleen als auteur (user_id = auth.uid()) en met dezelfde toegang als SELECT
DROP POLICY IF EXISTS chat_messages_insert ON public.chat_messages;
CREATE POLICY chat_messages_insert ON public.chat_messages
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND (
    subpoule_id IS NULL
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.subpoules s
      WHERE s.id = chat_messages.subpoule_id
        AND s.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.subpoule_members m
      WHERE m.subpoule_id = chat_messages.subpoule_id
        AND m.user_id = auth.uid()
    )
  )
);

-- DELETE: eigen auteur of admin
DROP POLICY IF EXISTS chat_messages_delete ON public.chat_messages;
CREATE POLICY chat_messages_delete ON public.chat_messages
FOR DELETE USING (
  user_id = auth.uid() OR public.is_admin()
);

-- ============================================
-- 3. REALTIME publication
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END$$;

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
