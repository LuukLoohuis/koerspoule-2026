-- Instelbare fontgrootte (px) voor de homepage-hero-quote, beheerd in
-- Admin → Rubriek → Homepage quote. NULL = frontend-default.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS homepage_quote_size integer;
