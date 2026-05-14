-- ── Rubriek: text posts and polls for "De Courant van Vandaag" ───────────────

CREATE TABLE IF NOT EXISTS public.rubriek_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id    uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('text', 'poll')) DEFAULT 'text',
  content    text,
  question   text,
  is_active  boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rubriek_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubriek_id  uuid NOT NULL REFERENCES public.rubriek_items(id) ON DELETE CASCADE,
  text        text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.rubriek_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubriek_id  uuid NOT NULL REFERENCES public.rubriek_items(id) ON DELETE CASCADE,
  option_id   uuid NOT NULL REFERENCES public.rubriek_options(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rubriek_votes_one_per_user UNIQUE (rubriek_id, user_id)
);

-- RLS
ALTER TABLE public.rubriek_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubriek_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubriek_votes   ENABLE ROW LEVEL SECURITY;

-- Public read; only admin can write
CREATE POLICY "rubriek_items_read"  ON public.rubriek_items FOR SELECT USING (true);
CREATE POLICY "rubriek_items_write" ON public.rubriek_items FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "rubriek_options_read"  ON public.rubriek_options FOR SELECT USING (true);
CREATE POLICY "rubriek_options_write" ON public.rubriek_options FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Everyone can read vote counts; only authenticated users can insert their own vote
CREATE POLICY "rubriek_votes_read"   ON public.rubriek_votes FOR SELECT USING (true);
CREATE POLICY "rubriek_votes_insert" ON public.rubriek_votes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- RPC: atomic vote cast — returns success/already_voted/error
CREATE OR REPLACE FUNCTION public.cast_rubriek_vote(p_rubriek_id uuid, p_option_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.rubriek_options
    WHERE id = p_option_id AND rubriek_id = p_rubriek_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_option');
  END IF;

  INSERT INTO public.rubriek_votes (rubriek_id, option_id, user_id)
  VALUES (p_rubriek_id, p_option_id, auth.uid())
  ON CONFLICT (rubriek_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_rubriek_vote(uuid, uuid) TO authenticated;
