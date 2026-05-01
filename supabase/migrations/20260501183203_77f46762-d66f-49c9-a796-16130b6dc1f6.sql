-- entry_predictions table
CREATE TABLE public.entry_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL,
  classification text NOT NULL CHECK (classification IN ('gc','points','kom','youth')),
  position integer NOT NULL CHECK (position BETWEEN 1 AND 3),
  rider_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entry_id, classification, position)
);

ALTER TABLE public.entry_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY entry_predictions_select ON public.entry_predictions
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.entries e WHERE e.id = entry_predictions.entry_id AND (e.user_id = auth.uid() OR public.is_admin()))
);

CREATE POLICY entry_predictions_modify ON public.entry_predictions
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.entries e WHERE e.id = entry_predictions.entry_id AND (e.user_id = auth.uid() OR public.is_admin()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.entries e WHERE e.id = entry_predictions.entry_id AND (e.user_id = auth.uid() OR public.is_admin()))
);

CREATE INDEX idx_entry_predictions_entry ON public.entry_predictions(entry_id);

-- RPC: save predictions atomically
CREATE OR REPLACE FUNCTION public.save_entry_predictions(
  p_entry_id uuid,
  p_predictions jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_status text;
  v_pred jsonb;
BEGIN
  SELECT user_id, status INTO v_user, v_status FROM public.entries WHERE id = p_entry_id;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF v_user <> auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_status = 'submitted' AND NOT public.is_admin() THEN RAISE EXCEPTION 'Entry already submitted'; END IF;

  DELETE FROM public.entry_predictions WHERE entry_id = p_entry_id;

  IF p_predictions IS NOT NULL AND jsonb_array_length(p_predictions) > 0 THEN
    FOR v_pred IN SELECT * FROM jsonb_array_elements(p_predictions) LOOP
      INSERT INTO public.entry_predictions (entry_id, classification, position, rider_id)
      VALUES (
        p_entry_id,
        v_pred->>'classification',
        (v_pred->>'position')::int,
        (v_pred->>'rider_id')::uuid
      );
    END LOOP;
  END IF;
END;
$$;