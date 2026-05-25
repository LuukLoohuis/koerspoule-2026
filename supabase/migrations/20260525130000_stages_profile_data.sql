-- ============================================
-- Geëxtraheerde profieldata per etappe (kernpunten: km, hoogte, labels, klim-%).
-- Gevuld door de edge function generate-stage-profile (vision-model leest het
-- touretappe-profiel), waarna de frontend er een strakke SVG van tekent.
-- ============================================

ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS profile_data jsonb;
