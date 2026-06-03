-- ── 1) chat_message_reactions.subpoule_id ───────────────────────────────────
ALTER TABLE public.chat_message_reactions
  ADD COLUMN IF NOT EXISTS subpoule_id uuid;

UPDATE public.chat_message_reactions r
SET subpoule_id = m.subpoule_id
FROM public.chat_messages m
WHERE r.message_id = m.id
  AND r.subpoule_id IS DISTINCT FROM m.subpoule_id;

CREATE OR REPLACE FUNCTION public.set_reaction_subpoule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.subpoule_id IS NULL THEN
    SELECT m.subpoule_id INTO NEW.subpoule_id
    FROM public.chat_messages m
    WHERE m.id = NEW.message_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_reaction_subpoule ON public.chat_message_reactions;
CREATE TRIGGER trg_set_reaction_subpoule
  BEFORE INSERT ON public.chat_message_reactions
  FOR EACH ROW EXECUTE FUNCTION public.set_reaction_subpoule();

CREATE INDEX IF NOT EXISTS idx_chat_reactions_subpoule
  ON public.chat_message_reactions(subpoule_id);

ALTER TABLE public.chat_message_reactions REPLICA IDENTITY FULL;

-- ── 2) chat_poll_votes.subpoule_id ──────────────────────────────────────────
ALTER TABLE public.chat_poll_votes
  ADD COLUMN IF NOT EXISTS subpoule_id uuid;

UPDATE public.chat_poll_votes v
SET subpoule_id = p.subpoule_id
FROM public.chat_polls p
WHERE v.poll_id = p.id
  AND v.subpoule_id IS DISTINCT FROM p.subpoule_id;

CREATE OR REPLACE FUNCTION public.set_vote_subpoule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.subpoule_id IS NULL THEN
    SELECT p.subpoule_id INTO NEW.subpoule_id
    FROM public.chat_polls p
    WHERE p.id = NEW.poll_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_vote_subpoule ON public.chat_poll_votes;
CREATE TRIGGER trg_set_vote_subpoule
  BEFORE INSERT ON public.chat_poll_votes
  FOR EACH ROW EXECUTE FUNCTION public.set_vote_subpoule();

CREATE INDEX IF NOT EXISTS idx_chat_poll_votes_subpoule
  ON public.chat_poll_votes(subpoule_id);

ALTER TABLE public.chat_poll_votes REPLICA IDENTITY FULL;