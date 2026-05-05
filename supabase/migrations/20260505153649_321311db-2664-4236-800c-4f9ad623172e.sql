CREATE TABLE IF NOT EXISTS public.notify_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  source text DEFAULT 'homepage'
);

ALTER TABLE public.notify_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY notify_subscribers_admin_all ON public.notify_subscribers
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.subscribe_notify(p_email text, p_source text DEFAULT 'homepage')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_email text;
BEGIN
  v_email := lower(trim(p_email));
  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Ongeldig e-mailadres';
  END IF;
  INSERT INTO public.notify_subscribers (email, source)
  VALUES (v_email, COALESCE(p_source, 'homepage'))
  ON CONFLICT (email) DO UPDATE SET unsubscribed_at = NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.subscribe_notify(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_notify_subscribers()
RETURNS TABLE(id uuid, email text, created_at timestamptz, unsubscribed_at timestamptz, source text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, email, created_at, unsubscribed_at, source
  FROM public.notify_subscribers
  WHERE public.is_admin()
  ORDER BY created_at DESC;
$$;