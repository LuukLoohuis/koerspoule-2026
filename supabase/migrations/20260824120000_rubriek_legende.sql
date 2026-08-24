-- ── De Legende: archiefverhalen als derde soort rubriek-item ──────────────────
--
-- Hergebruikt rubriek_items in plaats van een eigen tabel: het is dezelfde
-- redactionele handeling (schrijven, activeren, weghalen) en de admin heeft er
-- al een tabje voor. Drie kolommen erbij voor wat een verhaal extra nodig heeft
-- boven een gewone rubriekpost: een kop, een jaartal en een bron.
--
-- Let op: 'text' en 'poll' delen één actief item (de homepage-rubriek); een
-- legende heeft zijn eigen actieve item (de krant). De applicatie filtert
-- daarom op type bij het ophalen én bij het activeren.

ALTER TABLE public.rubriek_items
  ADD COLUMN IF NOT EXISTS titel text,
  ADD COLUMN IF NOT EXISTS jaar  text,
  ADD COLUMN IF NOT EXISTS bron  text;

-- De check op `type` staat er onder een gegenereerde naam. Die naam niet
-- aannemen maar opzoeken: hij verschilt per omgeving als de tabel ooit
-- opnieuw is aangemaakt.
DO $$
DECLARE
  v_naam text;
BEGIN
  SELECT con.conname INTO v_naam
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace ns ON ns.oid = rel.relnamespace
  WHERE ns.nspname = 'public'
    AND rel.relname = 'rubriek_items'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%poll%'
  LIMIT 1;

  IF v_naam IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.rubriek_items DROP CONSTRAINT %I', v_naam);
  END IF;
END $$;

ALTER TABLE public.rubriek_items
  ADD CONSTRAINT rubriek_items_type_check
  CHECK (type IN ('text', 'poll', 'legende'));
