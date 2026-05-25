-- ============================================
-- Etappe-profiel: URL naar een profielafbeelding (bv. van touretappe.nl of
-- een eigen upload). Getoond in "De Voorbeschouwing" in de Gazetta.
-- ============================================

ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS profile_image_url text;
