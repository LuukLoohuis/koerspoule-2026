-- Function to update updated_at column if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Rubriek items (text or poll)
CREATE TABLE public.rubriek_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('text', 'poll')),
    content TEXT, -- for 'text' type
    question TEXT, -- for 'poll' type
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Poll options
CREATE TABLE public.rubriek_options (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rubriek_id UUID REFERENCES public.rubriek_items(id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- User votes
CREATE TABLE public.rubriek_votes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rubriek_id UUID REFERENCES public.rubriek_items(id) ON DELETE CASCADE NOT NULL,
    option_id UUID REFERENCES public.rubriek_options(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(rubriek_id, user_id)
);

-- Indexes
CREATE INDEX idx_rubriek_items_game_active ON public.rubriek_items(game_id, is_active);
CREATE INDEX idx_rubriek_options_rubriek ON public.rubriek_options(rubriek_id);
CREATE INDEX idx_rubriek_votes_rubriek ON public.rubriek_votes(rubriek_id);
CREATE INDEX idx_rubriek_votes_user ON public.rubriek_votes(user_id);

-- RLS
ALTER TABLE public.rubriek_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubriek_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubriek_votes ENABLE ROW LEVEL SECURITY;

-- Policies: public view
CREATE POLICY "Anyone can view rubriek items" ON public.rubriek_items FOR SELECT USING (true);
CREATE POLICY "Anyone can view rubriek options" ON public.rubriek_options FOR SELECT USING (true);
CREATE POLICY "Anyone can view rubriek votes" ON public.rubriek_votes FOR SELECT USING (true);

-- Admin helper: check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin policies
CREATE POLICY "Admins can manage rubriek items" ON public.rubriek_items
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage rubriek options" ON public.rubriek_options
    FOR ALL USING (public.is_admin());

-- RPC for voting
CREATE OR REPLACE FUNCTION public.cast_rubriek_vote(p_rubriek_id UUID, p_option_id UUID)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_authenticated');
    END IF;

    IF EXISTS (SELECT 1 FROM public.rubriek_votes WHERE rubriek_id = p_rubriek_id AND user_id = v_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'already_voted');
    END IF;

    INSERT INTO public.rubriek_votes (rubriek_id, option_id, user_id)
    VALUES (p_rubriek_id, p_option_id, v_user_id);

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_rubriek_items_updated_at
    BEFORE UPDATE ON public.rubriek_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
