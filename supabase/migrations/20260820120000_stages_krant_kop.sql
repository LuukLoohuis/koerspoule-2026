-- Kop boven het hoofdartikel van de Krant, één per etappe.
--
-- Bewust op stages en niet op etappe_commentaren: dat commentaar staat per
-- subpoule, maar een kop over de uitslag gaat over de kóers en hoort voor
-- iedereen hetzelfde te zijn. Anders krijgt elke subpoule een eigen versie van
-- wat er die dag gebeurd is.
--
-- Wordt gevuld door generate-stage-commentary, in dezelfde OpenAI-aanroep die
-- het commentaar al maakt. Blijft de kolom leeg -- oudere etappes, of een
-- generatie die faalde -- dan bouwt de app zelf een kop uit de uitslag.

ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS krant_kop text;

COMMENT ON COLUMN public.stages.krant_kop IS
  'Kop voor het hoofdartikel van de Krant. Gegenereerd bij het etappecommentaar; '
  'de app controleert of de winnaar erin voorkomt en valt anders terug op een '
  'sjabloon uit de uitslag.';

-- Rollback:
--   ALTER TABLE public.stages DROP COLUMN IF EXISTS krant_kop;
