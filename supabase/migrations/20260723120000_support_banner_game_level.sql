-- Steun-banner op game-niveau i.p.v. per etappe.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS support_banner_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS support_banner_updated_at timestamptz;

-- Bestaande staat overnemen: game aan zodra minstens één etappe de banner aan had.
UPDATE public.games g
SET support_banner_visible = true,
    support_banner_updated_at = sub.max_upd
FROM (
  SELECT game_id, MAX(support_banner_updated_at) AS max_upd
  FROM public.stages
  WHERE support_banner_visible = true
  GROUP BY game_id
) sub
WHERE sub.game_id = g.id;
